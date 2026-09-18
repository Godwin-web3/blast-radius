/** 2^256 - 1, the usual `type(uint256).max` unlimited approval. */
export const MAX_UINT256 = (1n << 256n) - 1n;

/**
 * Allowances at or above this are treated as unlimited.
 * 1e59 is far beyond any real ERC-20 total supply in atomic units
 * (even SHIB ~1e32, so this is not a balance we will ever see "spent down").
 */
export const UNLIMITED_THRESHOLD = 10n ** 59n;

/**
 * True when an allowance can spend an unbounded (or practically unbounded)
 * amount. Includes `type(uint256).max`, `2^255` (signed-max), and huge
 * sentinel values some routers still set.
 */
export function isUnlimitedAllowance(allowance: bigint): boolean {
  if (allowance < 0n) {
    return false;
  }
  if (allowance >= MAX_UINT256 / 2n) {
    return true;
  }
  if (allowance >= UNLIMITED_THRESHOLD) {
    return true;
  }
  return false;
}

/**
 * How many tokens the spender can actually move *right now*:
 * unlimited → the whole balance; otherwise min(allowance, balance).
 * Zero balance still leaves the approval open (latent drain).
 */
export function movableAmount(allowance: bigint, balance: bigint): bigint {
  if (balance <= 0n) {
    return 0n;
  }
  if (isUnlimitedAllowance(allowance)) {
    return balance;
  }
  return allowance < balance ? allowance : balance;
}
