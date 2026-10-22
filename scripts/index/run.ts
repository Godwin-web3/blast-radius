/**
 * Nightly reverse spender exposure indexer.
 *
 *   ENVIO_API_TOKEN=... npx tsx scripts/index/run.ts [--only 0xabc,0xdef]
 *
 * 1. Grade every known Ethereum spender with lib/control.ts. A/B-grade spenders
 *    (no upgrade key) are skipped on purpose, except FORCE_INCLUDE.
 * 2. Discover: every ERC-20 Approval(owner, spender) from HyperSync, incremental
 *    from a checkpoint in $INDEX_CACHE (latest value per token/owner).
 * 3. Verify: Multicall3 allowance() + balanceOf() for every pair whose last event
 *    was non-zero. Event values lie (OZ v5 never emits Approval on transferFrom).
 * 4. Price with DefiLlama (confidence >= 0.9). Unpriced tokens are counted, never valued.
 * 5. Write $INDEX_OUT/index.json and $INDEX_OUT/spenders/<address>.json. A spender
 *    that could not finish keeps its previous published entry.
 */
import { createPublicClient, erc20Abi, getAddress, http, type Address } from "viem";
import { mainnet } from "viem/chains";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { CHAINS, type EvmChain } from "../../lib/chains";
import { getChainClient } from "../../lib/client";
import { profileSpender, type SpenderControl } from "../../lib/control";
import { ETHEREUM_SPENDERS } from "../../lib/known";
import type { IndexedSpender, SpenderIndex } from "../../lib/spender-index";

const APPROVAL = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";
const HYPERSYNC = process.env.HYPERSYNC_URL || "https://eth.hypersync.xyz";
const RPC = process.env.RPC_URL || "https://ethereum-rpc.publicnode.com";
const CACHE = process.env.INDEX_CACHE || ".index-cache";
const OUT = process.env.INDEX_OUT || "out";
const DEADLINE = Date.now() + Number(process.env.INDEX_BUDGET_MIN || 300) * 60_000;
/** Upgradeable through 0x "migrate"/feature registry even though no EIP-1967 slot. */
const FORCE_INCLUDE = new Set(["0xdef1c0ded9bec7f1a1670819833240f027b25eff"]);
const INDEXED_GRADES = new Set(["C", "D", "F", "?"]);
const CHUNK = 250;
const PARALLEL = Number(process.env.VERIFY_PARALLEL || 4);

const chain = CHAINS.ethereum as EvmChain;
const rpc = createPublicClient({
  chain: mainnet,
  transport: http(RPC, { timeout: 30_000, retryCount: 3 }),
  batch: { multicall: false },
});

const log = (...a: unknown[]) => console.error(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Checkpoint = { from: number; events: number; latest: Record<string, string> };

async function discover(spender: string): Promise<{ cp: Checkpoint; complete: boolean }> {
  const file = `${CACHE}/${spender}.disc.json`;
  const cp: Checkpoint = existsSync(file)
    ? JSON.parse(await readFile(file, "utf8"))
    : { from: 0, events: 0, latest: {} };
  const pad = "0x" + "0".repeat(24) + spender.slice(2);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.ENVIO_API_TOKEN) headers.authorization = `Bearer ${process.env.ENVIO_API_TOKEN}`;
  let pages = 0;
  let complete = false;
  let backoff = 5_000;
  while (Date.now() < DEADLINE) {
    const res = await fetch(`${HYPERSYNC}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from_block: cp.from,
        logs: [{ topics: [[APPROVAL], [], [pad]] }],
        field_selection: { log: ["address", "topic1", "topic3", "data"] },
      }),
    }).catch(() => null);
    if (!res || res.status === 429 || res.status >= 500) {
      await sleep(backoff);
      backoff = Math.min(backoff * 2, 60_000);
      continue;
    }
    if (!res.ok) throw new Error(`hypersync ${res.status}: ${await res.text()}`);
    backoff = 5_000;
    const j = (await res.json()) as {
      data: { logs?: { address: string; topic1: string; topic3?: string; data: string }[] }[];
      next_block: number;
      archive_height: number;
    };
    for (const d of j.data)
      for (const l of d.logs ?? []) {
        if (l.topic3) continue; // ERC-721 single-token approval, not ERC-20
        cp.events++;
        cp.latest[`${l.address.toLowerCase()}|0x${l.topic1.slice(26)}`] = l.data;
      }
    cp.from = j.next_block;
    if (++pages % 50 === 0) {
      await writeFile(file, JSON.stringify(cp));
      log(spender, "block", cp.from, "events", cp.events);
    }
    if (cp.from >= j.archive_height) {
      complete = true;
      break;
    }
  }
  await writeFile(file, JSON.stringify(cp));
  return { cp, complete };
}

type Live = { token: string; owner: string; movable: bigint; unlimited: boolean };

async function verify(spender: string, pairs: [string, string][]): Promise<{ live: Live[]; failed: number; block: number }> {
  const block = Number(await rpc.getBlockNumber());
  const live: Live[] = [];
  let failed = 0;
  const one = async (chunk: [string, string][]) => {
    const contracts = chunk.flatMap(([token, owner]) => [
      { address: token as Address, abi: erc20Abi, functionName: "allowance" as const, args: [owner as Address, spender as Address] },
      { address: token as Address, abi: erc20Abi, functionName: "balanceOf" as const, args: [owner as Address] },
    ]);
    for (let a = 0; a < 4; a++) {
      try {
        const res = await rpc.multicall({ contracts, allowFailure: true, blockNumber: BigInt(block) });
        chunk.forEach(([token, owner], k) => {
          const al = res[2 * k];
          const bal = res[2 * k + 1];
          if (al?.status !== "success" || bal?.status !== "success") return;
          const A = al.result as bigint;
          const B = bal.result as bigint;
          const mv = A < B ? A : B;
          if (mv > 0n) live.push({ token, owner, movable: mv, unlimited: A >= 1n << 255n });
        });
        return;
      } catch {
        await sleep(1500 * (a + 1));
      }
    }
    failed += chunk.length;
  };
  for (let i = 0; i < pairs.length; i += CHUNK * PARALLEL) {
    const batch: Promise<void>[] = [];
    for (let p = 0; p < PARALLEL; p++) {
      const c = pairs.slice(i + p * CHUNK, i + (p + 1) * CHUNK);
      if (c.length) batch.push(one(c));
    }
    await Promise.all(batch);
    if ((i / (CHUNK * PARALLEL)) % 25 === 0) log(spender, "verified", i, "/", pairs.length);
  }
  return { live, failed, block };
}

type Price = { price: number; decimals: number; symbol: string };
async function prices(tokens: string[]): Promise<Map<string, Price>> {
  const out = new Map<string, Price>();
  for (let i = 0; i < tokens.length; i += 80) {
    const ids = tokens.slice(i, i + 80).map((a) => `ethereum:${a}`).join(",");
    for (let a = 0; a < 3; a++) {
      try {
        const j = (await (await fetch(`https://coins.llama.fi/prices/current/${ids}`)).json()) as {
          coins: Record<string, Price & { confidence?: number }>;
        };
        for (const [k, v] of Object.entries(j.coins))
          if ((v.confidence ?? 1) >= 0.9 && v.price > 0) out.set(k.split(":")[1]!.toLowerCase(), v);
        break;
      } catch {
        await sleep(2000);
      }
    }
  }
  return out;
}

async function isContract(addresses: string[]): Promise<Map<string, boolean>> {
  const m = new Map<string, boolean>();
  await Promise.all(
    addresses.map(async (a) => {
      const code = await rpc.getCode({ address: a as Address }).catch(() => undefined);
      // EIP-7702 delegated EOAs (0xef0100…) are still EOAs.
      if (code !== undefined) m.set(a, !!code && code !== "0x" && !code.startsWith("0xef0100"));
    }),
  );
  return m;
}

function controllerOf(c: SpenderControl): IndexedSpender["controller"] {
  const k = c.controller;
  if (!k) return null;
  const label =
    k.kind === "safe" && k.threshold && k.owners ? `${k.threshold}-of-${k.owners} Safe`
    : k.kind === "timelock" && k.minDelaySec !== undefined ? `Timelock, ${Math.round(k.minDelaySec / 3600)}h delay`
    : k.kind === "eoa" ? "Single EOA" : k.kind;
  return { address: k.address, kind: k.kind, label: k.via ? `${label} via ProxyAdmin` : label };
}

async function indexSpender(address: string, label: string, control: SpenderControl): Promise<IndexedSpender | null> {
  const sp = address.toLowerCase();
  log("==", label, sp, control.grade);
  const { cp, complete } = await discover(sp);
  if (!complete) {
    log(sp, "discovery incomplete at block", cp.from, "- keeping previous entry");
    return null;
  }
  const pairs = Object.entries(cp.latest)
    .filter(([, v]) => v && v !== "0x" && BigInt(v) > 0n)
    .map(([k]) => k.split("|") as [string, string]);
  const { live, failed, block } = await verify(sp, pairs);
  if (failed > pairs.length * 0.02) {
    log(sp, "too many failed reads", failed, "- keeping previous entry");
    return null;
  }
  const px = await prices([...new Set(live.map((l) => l.token))]);
  let usd = 0;
  let unpriced = 0;
  const byToken = new Map<string, { symbol: string; usd: number; wallets: Set<string> }>();
  const byOwner = new Map<string, number>();
  for (const l of live) {
    const p = px.get(l.token);
    if (!p) {
      unpriced++;
      continue;
    }
    const v = (Number(l.movable) / 10 ** p.decimals) * p.price;
    if (!Number.isFinite(v)) continue;
    usd += v;
    const t = byToken.get(l.token) ?? { symbol: p.symbol, usd: 0, wallets: new Set() };
    t.usd += v;
    t.wallets.add(l.owner);
    byToken.set(l.token, t);
    byOwner.set(l.owner, (byOwner.get(l.owner) ?? 0) + v);
  }
  const topWallets = [...byOwner].sort((a, b) => b[1] - a[1]).slice(0, 50);
  const contracts = await isContract(topWallets.map(([a]) => a));
  return {
    address: getAddress(sp),
    label,
    chain: "ethereum",
    grade: control.grade,
    summary: control.summary,
    controller: controllerOf(control),
    movableUsd: Math.round(usd),
    wallets: new Set(live.map((l) => l.owner)).size,
    livePairs: live.length,
    unlimitedLivePairs: live.filter((l) => l.unlimited).length,
    unpricedPairs: unpriced,
    approvalEvents: cp.events,
    eventNonzeroPairs: pairs.length,
    topTokens: [...byToken]
      .sort((a, b) => b[1].usd - a[1].usd)
      .slice(0, 15)
      .map(([address, t]) => ({ address: getAddress(address), symbol: t.symbol, usd: Math.round(t.usd), wallets: t.wallets.size })),
    topWallets: topWallets.map(([a, v]) => ({ address: getAddress(a), usd: Math.round(v), isContract: contracts.get(a) })),
    block,
    updatedAt: new Date().toISOString(),
  };
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  await mkdir(`${OUT}/spenders`, { recursive: true });
  const onlyArg = process.argv.indexOf("--only");
  const only = onlyArg > 0 ? new Set(process.argv[onlyArg + 1]!.toLowerCase().split(",")) : null;

  const prevFile = `${OUT}/index.json`;
  const prev: SpenderIndex | null = existsSync(prevFile) ? JSON.parse(await readFile(prevFile, "utf8")) : null;
  const entries = new Map((prev?.spenders ?? []).map((s) => [s.address.toLowerCase(), s]));
  const skipped: SpenderIndex["skipped"] = [];

  const client = getChainClient(chain);
  const seen = new Set<string>();
  // Spenders whose discovery is furthest along go first, so a slow first backfill
  // (free-tier rate limits) never starves the incremental refresh of the others.
  const progress = (a: string) => {
    const f = `${CACHE}/${a.toLowerCase()}.disc.json`;
    if (!existsSync(f)) return 0;
    const m = /"from":(\d+)/.exec(readFileSync(f, "utf8").slice(0, 200));
    return m ? Number(m[1]) : 0;
  };
  const ordered = [...ETHEREUM_SPENDERS].sort((x, y) => progress(y.address) - progress(x.address));
  for (const s of ordered) {
    const a = s.address.toLowerCase();
    if (seen.has(a) || (only && !only.has(a))) continue;
    seen.add(a);
    const control = await profileSpender(client, chain, s.address).catch(() => null);
    const grade = control?.grade ?? "?";
    if (!control || (!INDEXED_GRADES.has(grade) && !FORCE_INCLUDE.has(a))) {
      skipped.push({ address: s.address, label: s.label, grade });
      entries.delete(a);
      continue;
    }
    if (Date.now() > DEADLINE) {
      log("budget exhausted, stopping before", s.label);
      break;
    }
    const row = await indexSpender(a, s.label, control);
    if (row) {
      entries.set(a, row);
      await writeFile(`${OUT}/spenders/${a}.json`, JSON.stringify(row, null, 1));
      log("done", s.label, `$${row.movableUsd}`, row.wallets, "wallets");
    }
  }

  const index: SpenderIndex = {
    version: 1,
    generatedAt: new Date().toISOString(),
    chain: "ethereum",
    spenders: [...entries.values()].map(({ topWallets, ...rest }) => ({ ...rest, topWallets: topWallets.slice(0, 5) })),
    skipped: only ? prev?.skipped ?? skipped : skipped,
  };
  await writeFile(prevFile, JSON.stringify(index, null, 1));
  log("wrote", index.spenders.length, "spenders");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
