/**
// Local anvil must bypass any HTTP proxy the environment routes through.
process.env.NO_PROXY = [process.env.NO_PROXY, "127.0.0.1", "localhost"].filter(Boolean).join(",");
 * Fork prover: turn a spender's control grade into proof.
 *
 *   npx tsx prover/run.ts <spenderAddress> [--block N] [--rpc URL]
 *
 * For a spender the index graded upgradeable (a compromised controller can change
 * its code), this forks mainnet, replaces the spender's code with a Drainer, and
 * actually pulls every live approval from its most-exposed wallets into an attacker
 * account. What the attacker ends up holding is the *proven* loss, in one tx, not an
 * estimate. Grade A (no key) is never run: there is nothing to compromise.
 *
 * Needs a local `anvil` (foundry). Reads the spender's wallets/tokens from the index
 * artifact in ./out, falls back to on-chain reads for any missing holding.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  getAddress,
  http,
  parseAbi,
  type Address,
} from "viem";
import { mainnet } from "viem/chains";
import type { IndexedSpender } from "../lib/spender-index";

const UPSTREAM = process.argv.includes("--rpc")
  ? process.argv[process.argv.indexOf("--rpc") + 1]!
  : process.env.RPC_URL || "https://ethereum-rpc.publicnode.com";
const PORT = Number(process.env.ANVIL_PORT || 8545);
const LOCAL = `http://127.0.0.1:${PORT}`;
const HOME_ANVIL = `${process.env.HOME}/.foundry/bin/anvil`;
// Local sandbox keeps anvil under ~/.foundry; CI (foundry-toolchain) puts it on PATH.
const ANVIL = process.env.ANVIL_BIN || (existsSync(HOME_ANVIL) ? HOME_ANVIL : "anvil");
// Anvil's first default account; its private key is public and holds no real funds.
const ATTACKER = getAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
const SWEEP = parseAbi(["function sweep(address[] tokens, address[] victims, address to) returns (uint256)"]);

const log = (...a: unknown[]) => console.error(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function startAnvil(block?: number): Promise<ChildProcess> {
  log("forking", UPSTREAM, block ? `at block ${block}` : "at latest");
  // Pinning an old block needs an archive node; public endpoints only serve recent
  // state, so default to latest and let the live re-check below define the snapshot.
  const args = ["--fork-url", UPSTREAM, "--port", String(PORT), "--silent", "--disable-block-gas-limit", "--base-fee", "0"];
  if (block) args.push("--fork-block-number", String(block));
  const p = spawn(ANVIL, args, {
    env: { ...process.env, NODE_USE_ENV_PROXY: "1" },
  });
  p.on("error", (e) => {
    throw e;
  });
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(LOCAL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      });
      if (r.ok) return p;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error("anvil did not start");
}

async function loadSpender(addr: string): Promise<IndexedSpender> {
  const f = `out/spenders/${addr.toLowerCase()}.json`;
  if (!existsSync(f)) throw new Error(`no index artifact ${f} - run the indexer first`);
  return JSON.parse(await readFile(f, "utf8"));
}

async function prices(tokens: string[]): Promise<Map<string, { price: number; decimals: number }>> {
  const m = new Map<string, { price: number; decimals: number }>();
  const ids = tokens.map((a) => `ethereum:${a}`).join(",");
  try {
    const j = (await (await fetch(`https://coins.llama.fi/prices/current/${ids}`)).json()) as {
      coins: Record<string, { price: number; decimals: number; confidence?: number }>;
    };
    for (const [k, v] of Object.entries(j.coins))
      if ((v.confidence ?? 1) >= 0.9) m.set(k.split(":")[1]!.toLowerCase(), v);
  } catch {
    /* unpriced tokens are simply not valued */
  }
  return m;
}

async function main() {
  const spenderArg = process.argv[2];
  if (!spenderArg || !/^0x[0-9a-fA-F]{40}$/.test(spenderArg)) throw new Error("usage: tsx prover/run.ts <spender> [--block N]");
  const spender = getAddress(spenderArg);
  const idx = await loadSpender(spender);
  if (!["C", "D", "F", "?"].includes(idx.grade)) {
    throw new Error(`${spender} is grade ${idx.grade}: no controller to compromise, nothing to prove this way`);
  }
  const blockArg = process.argv.indexOf("--block");
  const block = blockArg > 0 ? Number(process.argv[blockArg + 1]) : undefined;

    const drainer = JSON.parse(await readFile("prover/build/Drainer.json", "utf8")) as { deployed: `0x${string}` };
  const anvil = await startAnvil(block);
  try {
    const pub = createPublicClient({ chain: mainnet, transport: http(LOCAL) });
    const forkBlock = Number(await pub.getBlockNumber());
    const test = createTestClient({ chain: mainnet, mode: "anvil", transport: http(LOCAL) });
    const wallet = createWalletClient({ account: ATTACKER, chain: mainnet, transport: http(LOCAL) });

    // Candidate (token, victim) pairs: the cartesian product of the index's most
    // exposed wallets and most valuable tokens, filtered to live allowance+balance.
    const tokens = idx.topTokens.map((t) => getAddress(t.address));
    const victims = idx.topWallets.map((w) => getAddress(w.address));
    const probe = pub as unknown as ReturnType<typeof createPublicClient>;
    const contracts = victims.flatMap((v) =>
      tokens.flatMap((t) => [
        { address: t, abi: erc20Abi, functionName: "allowance" as const, args: [v, spender] },
        { address: t, abi: erc20Abi, functionName: "balanceOf" as const, args: [v] },
      ]),
    );
    const reads = await probe.multicall({ contracts, allowFailure: true });
    const live: { token: Address; victim: Address }[] = [];
    victims.forEach((v, vi) => {
      tokens.forEach((t, ti) => {
        const base = (vi * tokens.length + ti) * 2;
        const al = reads[base];
        const bal = reads[base + 1];
        if (al?.status === "success" && bal?.status === "success" && (al.result as bigint) > 0n && (bal.result as bigint) > 0n)
          live.push({ token: t, victim: v });
      });
    });
    log("live pairs to attack:", live.length);

    // Model the compromised controller: put the Drainer where the spender's code is.
    // The index already established the code is changeable; this is the attacker's goal state.
    await test.setCode({ address: spender, bytecode: drainer.deployed });
    await test.setBalance({ address: ATTACKER, value: 10n ** 20n });

    const px = await prices(tokens.map((t) => t.toLowerCase()));
    const before = new Map<string, bigint>();
    for (const t of tokens) before.set(t.toLowerCase(), await pub.readContract({ address: t, abi: erc20Abi, functionName: "balanceOf", args: [ATTACKER] }));

    // One transaction, in batches so calldata stays sane.
    let txs = 0;
    for (let i = 0; i < live.length; i += 120) {
      const chunk = live.slice(i, i + 120);
      const hash = await wallet.sendTransaction({
        to: spender,
        data: encodeFunctionData({ abi: SWEEP, functionName: "sweep", args: [chunk.map((c) => c.token), chunk.map((c) => c.victim), ATTACKER] }),
        gas: 300_000_000n,
      });
      const rc = await pub.waitForTransactionReceipt({ hash });
      log("sweep tx", i / 120, rc.status, "gasUsed", rc.gasUsed, "logs", rc.logs.length);
      txs++;
    }

    let provenUsd = 0;
    const byToken: { symbol: string; usd: number }[] = [];
    for (const t of tokens) {
      const key = t.toLowerCase();
      const after = await pub.readContract({ address: t, abi: erc20Abi, functionName: "balanceOf", args: [ATTACKER] });
      const gained = after - (before.get(key) ?? 0n);
      const p = px.get(key);
      if (gained > 0n && p) {
        const usd = (Number(gained) / 10 ** p.decimals) * p.price;
        provenUsd += usd;
        byToken.push({ symbol: idx.topTokens.find((x) => x.address.toLowerCase() === key)?.symbol ?? key, usd: Math.round(usd) });
      }
    }
    byToken.sort((a, b) => b.usd - a.usd);

    const proof = {
      spender,
      label: idx.label,
      grade: idx.grade,
      controller: idx.controller,
      block: forkBlock,
      method: "fork-setcode-sweep",
      note: "Code replaced on an anvil fork to model a compromised controller. USD is tokens actually transferred to an attacker in-sim, priced by DefiLlama.",
      pairsAttacked: live.length,
      walletsDrained: new Set(live.map((l) => l.victim)).size,
      transactions: txs,
      provenDrainUsd: Math.round(provenUsd),
      indexMovableUsd: idx.movableUsd,
      byToken: byToken.slice(0, 15),
      provenAt: new Date().toISOString(),
    };
    await mkdir("out/proofs", { recursive: true });
    await writeFile(`out/proofs/${spender.toLowerCase()}.json`, JSON.stringify(proof, null, 1));
    log("PROVEN", `$${proof.provenDrainUsd}`, "from", proof.walletsDrained, "wallets in", txs, "tx");
    console.log(JSON.stringify(proof));
  } finally {
    anvil.kill("SIGKILL");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
