import type { RankableApproval } from "./types";
import { isUnlimitedAllowance, movableAmount } from "./unlimited";

const NFT_BASE = 5_000_000;
const UNLIMITED_LIVE_BASE = 10_000_000;
const UNLIMITED_LATENT_BASE = 1_000_000;

/** Convert atomic units to a float for ranking only — never shown as USD. */
export function normalizedAmount(amount: bigint, decimals: number): number {
  if (amount <= 0n) {
    return 0;
  }
  const d = Number.isFinite(decimals) ? Math.max(0, Math.min(36, decimals)) : 18;
  const whole = amount / 10n ** BigInt(d);
  const frac = amount % 10n ** BigInt(d);
  const fracNum = Number(frac) / 10 ** d;
  const wholeNum = Number(whole);
  if (!Number.isFinite(wholeNum)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return wholeNum + fracNum;
}

/**
 * Higher score = more blast radius.
 * Unlimited live ERC-20 (tokens sitting behind max allowance) ranks first,
 * then operator-wide NFT approvals, then latent unlimited, then limited
 * by real USD if we have it — never by a guessed price.
 */
export function riskScore(approval: RankableApproval): number {
  if (approval.kind === "erc721-for-all") {
    return NFT_BASE;
  }

  const usd = approval.usdMovable;
  const normalized = normalizedAmount(approval.movable, approval.decimals);

  if (approval.unlimited && approval.balance > 0n) {
    const value = usd ?? 0;
    return UNLIMITED_LIVE_BASE + value + Math.min(normalized, 999);
  }

  if (approval.unlimited) {
    return UNLIMITED_LATENT_BASE;
  }

  if (usd != null && usd > 0) {
    return usd;
  }

  return normalized;
}

export function rankApprovals<T extends RankableApproval>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const delta = riskScore(b) - riskScore(a);
    if (delta !== 0) {
      return delta;
    }
    if (a.unlimited !== b.unlimited) {
      return a.unlimited ? -1 : 1;
    }
    if (a.movable !== b.movable) {
      return a.movable > b.movable ? -1 : 1;
    }
    return a.id.localeCompare(b.id);
  });
}

export function approvalId(token: string, spender: string, kind: string): string {
  return `${kind}:${token.toLowerCase()}:${spender.toLowerCase()}`;
}

export { isUnlimitedAllowance, movableAmount };
