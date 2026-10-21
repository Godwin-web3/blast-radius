import { getAddress, parseAbi, parseAbiItem, type Address } from "viem";
import type { EvmChain } from "./chains";
import type { ChainClient } from "./client";
import { isZeroAddress } from "./format";
import { PERMIT2 } from "./known";
import { withTimeout } from "./timeout";

/**
 * Permit2 sub-allowances.
 *
 * An ERC-20 approval to Permit2 is only the outer door. The real exposure
 * lives in Permit2's own table: allowance(owner, token, spender) returns
 * (uint160 amount, uint48 expiration, uint48 nonce). A spender listed there
 * can pull up to `amount` until `expiration`, as long as the token still has
 * an ERC-20 allowance to Permit2.
 */

export const PERMIT2_ABI = parseAbi([
  "function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
]);

const PERMIT2_APPROVAL = parseAbiItem(
  "event Approval(address indexed owner, address indexed token, address indexed spender, uint160 amount, uint48 expiration)",
);
const PERMIT2_PERMIT = parseAbiItem(
  "event Permit(address indexed owner, address indexed token, address indexed spender, uint160 amount, uint48 expiration, uint48 nonce)",
);

/** type(uint160).max — Permit2's "unlimited". */
export const MAX_UINT160 = (1n << 160n) - 1n;

export function isUnlimitedPermit2(amount: bigint): boolean {
  return amount >= MAX_UINT160 / 2n;
}

export type Permit2Pair = { token: Address; spender: Address };

export type Permit2Allowance = Permit2Pair & {
  amount: bigint;
  expiration: number;
  nonce: number;
};

/** Live = non-zero amount and not yet expired. */
export function isLivePermit2(a: { amount: bigint; expiration: number }, nowSec: number): boolean {
  return a.amount > 0n && a.expiration > nowSec;
}

/**
 * Effective movable through Permit2 = min(sub-allowance, outer ERC-20
 * allowance to Permit2, balance).
 */
export function permit2Movable(
  subAmount: bigint,
  outerAllowance: bigint,
  balance: bigint,
  outerUnlimited: boolean,
): bigint {
  if (balance <= 0n) return 0n;
  let cap = balance;
  if (!isUnlimitedPermit2(subAmount) && subAmount < cap) cap = subAmount;
  if (!outerUnlimited && outerAllowance < cap) cap = outerAllowance;
  return cap;
}

function key(p: Permit2Pair): string {
  return `${p.token.toLowerCase()}:${p.spender.toLowerCase()}`;
}

/** Discover (token, spender) Permit2 pairs from Permit2's own logs, filtered by owner. */
export async function discoverPermit2Pairs(
  client: ChainClient,
  owner: Address,
  latest: bigint,
  budgetMs = 8_000,
): Promise<{ pairs: Permit2Pair[]; complete: boolean }> {
  const out = new Map<string, Permit2Pair>();
  const started = Date.now();
  let complete = true;

  const ingest = (logs: ReadonlyArray<{ args?: { token?: Address; spender?: Address } }>) => {
    for (const l of logs) {
      const token = l.args?.token;
      const spender = l.args?.spender;
      if (!token || !spender || isZeroAddress(token) || isZeroAddress(spender)) continue;
      try {
        const p = { token: getAddress(token), spender: getAddress(spender) };
        out.set(key(p), p);
      } catch {
        // skip
      }
    }
  };

  const range = async (from: bigint, to: bigint, depth: number): Promise<void> => {
    if (Date.now() - started > budgetMs) {
      complete = false;
      return;
    }
    try {
      const [a, b] = await withTimeout(Promise.all([
        client.getLogs({ address: PERMIT2, event: PERMIT2_APPROVAL, args: { owner }, fromBlock: from, toBlock: to }),
        client.getLogs({ address: PERMIT2, event: PERMIT2_PERMIT, args: { owner }, fromBlock: from, toBlock: to }),
      ]), 4_000, "Permit2 getLogs");
      ingest(a);
      ingest(b);
    } catch {
      if (depth >= 6 || to - from < 10_000n) {
        complete = false;
        return;
      }
      const mid = from + (to - from) / 2n;
      await range(mid + 1n, to, depth + 1); // newest first
      await range(from, mid, depth + 1);
    }
  };

  await range(0n, latest, 0);
  return { pairs: [...out.values()], complete };
}

/** Read live Permit2 allowances for candidate pairs. */
export async function readPermit2Allowances(
  client: ChainClient,
  owner: Address,
  pairs: readonly Permit2Pair[],
): Promise<Permit2Allowance[]> {
  if (pairs.length === 0) return [];
  const rows = (await client.multicall({
    contracts: pairs.map((p) => ({
      address: PERMIT2,
      abi: PERMIT2_ABI,
      functionName: "allowance" as const,
      args: [owner, p.token, p.spender] as const,
    })),
    allowFailure: true,
  })) as ReadonlyArray<
    { status: "success"; result: readonly [bigint, number, number] } | { status: "failure" }
  >;
  const out: Permit2Allowance[] = [];
  rows.forEach((row, i) => {
    const p = pairs[i];
    if (!p || row.status !== "success") return;
    const [amount, expiration, nonce] = row.result;
    out.push({ ...p, amount: BigInt(amount), expiration: Number(expiration), nonce: Number(nonce) });
  });
  return out;
}

export function permit2Supported(_chain: EvmChain): boolean {
  // Permit2 is deployed at the same address on Ethereum, Base and Arbitrum.
  return true;
}
