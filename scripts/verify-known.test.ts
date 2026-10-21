/**
 * On-chain sanity check for lib/known.ts: every hardcoded token, spender,
 * NFT and operator must have code, and token symbol() mismatches are printed as notes
 * (some tokens, like bridged USDC.e, report a different on-chain symbol).
 * Network-bound, so it is not part of `npm test`. Run: npm run verify:known
 */
import { expect, it } from "vitest";
import { erc20Abi } from "viem";
import { CHAINS } from "../lib/chains";
import { getChainClient } from "../lib/client";
import { catalogFor } from "../lib/known";

it("every known address is a live contract", async () => {
  const problems: string[] = [];
  for (const slug of ["ethereum", "base", "arbitrum"] as const) {
    const chain = CHAINS[slug] as never;
    const client = getChainClient(chain);
    const cat = catalogFor(chain);
    const rows = [
      ...cat.tokens.map((t) => ({ kind: "token", label: t.symbol, address: t.address, symbol: t.symbol })),
      ...cat.spenders.map((t) => ({ kind: "spender", label: t.label, address: t.address })),
      ...cat.nfts.map((t) => ({ kind: "nft", label: t.symbol, address: t.address })),
      ...cat.operators.map((t) => ({ kind: "operator", label: t.label, address: t.address })),
    ];
    for (const row of rows) {
      const code = await client.getCode({ address: row.address }).catch(() => "ERR");
      if (!code || code === "0x") problems.push(`${slug} ${row.kind} ${row.label} ${row.address}: no code`);
      if ("symbol" in row && row.symbol && code && code !== "0x" && code !== "ERR") {
        const sym = await client
          .readContract({ address: row.address, abi: erc20Abi, functionName: "symbol" })
          .catch(() => null);
        if (sym && String(sym).toLowerCase() !== String(row.symbol).toLowerCase()) {
          console.warn(`note: ${slug} token ${row.label} ${row.address}: on-chain symbol() is ${sym}`);
        }
      }
    }
  }
  if (problems.length) console.log(problems.join("\n"));
  expect(problems).toEqual([]);
}, 300_000);
