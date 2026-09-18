import type { Headline, OpenApproval } from "./types";

function roundUsd(n: number): number {
  if (!Number.isFinite(n) || n <= 0) {
    return 0;
  }
  return Math.round(n * 100) / 100;
}

/** Compact USD for posters. Callers must pass a real summed price, never 0-as-unknown. */
export function formatUsdCompact(amount: number): string {
  const n = roundUsd(amount);
  if (n < 1) {
    return `$${n.toFixed(2)}`;
  }
  if (n < 1000) {
    return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  if (n < 10_000) {
    return `$${(n / 1000).toFixed(1)}K`;
  }
  if (n < 1_000_000) {
    return `$${Math.round(n / 1000)}K`;
  }
  if (n < 10_000_000) {
    return `$${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n < 1_000_000_000) {
    return `$${Math.round(n / 1_000_000)}M`;
  }
  return `$${(n / 1_000_000_000).toFixed(1)}B`;
}

/**
 * Poster headline. Dollar figures appear only when CoinGecko (or another
 * live price source) returned a price for at least one movable balance.
 * We never invent a USD number.
 */
export function buildHeadline(approvals: readonly OpenApproval[]): Headline {
  const openCount = approvals.length;
  const unlimitedCount = approvals.filter((a) => a.unlimited).length;

  let usdTotal = 0;
  let pricedCount = 0;
  let unpricedCount = 0;
  let anyPrice = false;

  for (const a of approvals) {
    if (a.kind !== "erc20") {
      continue;
    }
    if (a.usdMovable != null) {
      anyPrice = true;
      pricedCount += 1;
      usdTotal += a.usdMovable;
    } else if (a.movable > 0n) {
      unpricedCount += 1;
    }
  }

  usdTotal = roundUsd(usdTotal);

  if (openCount === 0) {
    return {
      title: "CLEAN",
      hasUsd: false,
      usdTotal: null,
      openCount,
      unlimitedCount,
      pricedCount: 0,
      unpricedCount: 0,
    };
  }

  if (anyPrice && usdTotal > 0) {
    const compact = formatUsdCompact(usdTotal);
    const title =
      unpricedCount > 0
        ? `${compact} PRICED`
        : `${compact} EXPOSED`;
    return {
      title,
      hasUsd: true,
      usdTotal,
      openCount,
      unlimitedCount,
      pricedCount,
      unpricedCount,
    };
  }

  if (unlimitedCount > 0) {
    return {
      title:
        unlimitedCount === 1
          ? "UNLIMITED"
          : `${unlimitedCount} UNLIMITED`,
      hasUsd: false,
      usdTotal: null,
      openCount,
      unlimitedCount,
      pricedCount,
      unpricedCount,
    };
  }

  return {
    title: openCount === 1 ? "1 OPEN ALLOWANCE" : `${openCount} OPEN ALLOWANCES`,
    hasUsd: false,
    usdTotal: null,
    openCount,
    unlimitedCount,
    pricedCount,
    unpricedCount,
  };
}

export const POSTER_QUOTE =
  "Still movable if these spenders turn hostile.";
