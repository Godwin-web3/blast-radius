// Step 2: verify live movable = min(allowance, balance) for discovered pairs, price via DefiLlama.
import { createPublicClient, http, erc20Abi } from "viem";
import { mainnet } from "viem/chains";
import { readFile, writeFile } from "node:fs/promises";
const SP = (process.argv[2] || "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5").toLowerCase();
const RPC = process.env.RPC_URL || "https://ethereum-rpc.publicnode.com";
const client = createPublicClient({ chain: mainnet, transport: http(RPC, { timeout: 30_000, retryCount: 3 }), batch: { multicall: false } });
const pairs = JSON.parse(await readFile(`data/${SP}.pairs.json`, "utf8")).map((k) => k.split("|"));
import { existsSync, appendFileSync } from "node:fs";
const ck = `data/${SP}.live.ndjson`, pos = `data/${SP}.pos`;
let start = existsSync(pos) ? Number(await readFile(pos, "utf8")) : 0;
const t = Date.now(); const CH = 250, PAR = Number(process.env.PAR || 4), BUDGET = Number(process.env.BUDGET_S || 1000) * 1000; let failed = 0;
async function doChunk(chunk) {
  const contracts = chunk.flatMap(([token, owner]) => [
    { address: token, abi: erc20Abi, functionName: "allowance", args: [owner, SP] },
    { address: token, abi: erc20Abi, functionName: "balanceOf", args: [owner] },
  ]);
  let res;
  for (let a = 0; a < 3 && !res; a++) { try { res = await client.multicall({ contracts, allowFailure: true }); } catch (e) { await new Promise(r => setTimeout(r, 1500)); } }
  if (!res) { failed += chunk.length; return []; }
  const live = [];
  chunk.forEach(([token, owner], k) => {
    const al = res[2 * k], bal = res[2 * k + 1];
    if (al.status !== "success" || bal.status !== "success") return;
    const mv = al.result < bal.result ? al.result : bal.result;
    if (mv > 0n) live.push({ token, owner, movable: mv.toString(), unlimited: al.result >= (1n << 255n) });
  });
  return live;
}
for (let i = start; i < pairs.length && Date.now() - t < BUDGET; i += CH * PAR) {
  const parts = await Promise.all(Array.from({ length: PAR }, (_, p) => pairs.slice(i + p * CH, i + (p + 1) * CH)).filter(c => c.length).map(doChunk));
  const rows = parts.flat(); if (rows.length) appendFileSync(ck, rows.map(r => JSON.stringify(r)).join("\n") + "\n");
  start = Math.min(pairs.length, i + CH * PAR); await writeFile(pos, String(start));
}
console.error("pos", start, "of", pairs.length, "failedThisRun", failed);
if (start < pairs.length) process.exit(0);
const live = (await readFile(ck, "utf8")).trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
const tokens = [...new Set(live.map((l) => l.token))];
const prices = {};
for (let i = 0; i < tokens.length; i += 80) {
  const ids = tokens.slice(i, i + 80).map((a) => `ethereum:${a}`).join(",");
  try { const j = await (await fetch(`https://coins.llama.fi/prices/current/${ids}`)).json();
    for (const [k, v] of Object.entries(j.coins)) if ((v.confidence ?? 1) >= 0.9) prices[k.split(":")[1].toLowerCase()] = v; } catch {}
}
let usd = 0; const byToken = {}; const byOwner = {}; let unpriced = 0;
for (const l of live) {
  const p = prices[l.token]; if (!p) { unpriced++; continue; }
  const v = Number(BigInt(l.movable)) / 10 ** p.decimals * p.price; l.usd = v; usd += v;
  byToken[p.symbol] = (byToken[p.symbol] || 0) + v; byOwner[l.owner] = (byOwner[l.owner] || 0) + v;
}
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, Math.round(v)]);
const out = { spender: SP, pairsChecked: pairs.length, failed, livePairs: live.length, wallets: new Set(live.map(l => l.owner)).size,
  unlimitedLive: live.filter(l => l.unlimited).length, tokens: tokens.length, unpricedPairs: unpriced, movableUsd: Math.round(usd),
  topTokens: top(byToken, 10), topWallets: top(byOwner, 10), secs: (Date.now() - t) / 1000 };
console.log(JSON.stringify(out, null, 1));
await writeFile(`data/${SP}.summary.json`, JSON.stringify(out, null, 1));
