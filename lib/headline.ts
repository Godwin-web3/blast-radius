import type { Headline, OpenApproval } from "./types";
import { isFungibleKind } from "./types";

export type HeadlineNoun = "allowance" | "delegate";

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
export function buildHeadline(
  approvals: readonly OpenApproval[],
  options: { noun?: HeadlineNoun } = {},
): Headline {
  const core = buildHeadlineCore(approvals, options);
  if (!approvals.some((a) => a.control)) {
    return core;
  }
  const weak = approvals.filter((a) => a.control && (a.control.grade === "D" || a.control.grade === "F"));
  const priced = weak.filter((a) => a.usdMovable != null && a.kind !== "permit2");
  const weakUsd = priced.reduce((sum, a) => sum + (a.usdMovable ?? 0), 0);
  return {
    ...core,
    weakControlCount: weak.length,
    weakControlUsd: priced.length > 0 ? roundUsd(weakUsd) : null,
  };
}

function buildHeadlineCore(
  approvals: readonly OpenApproval[],
  options: { noun?: HeadlineNoun } = {},
): Headline {
  const noun = options.noun ?? inferHeadlineNoun(approvals);
  const openCount = approvals.length;
  const unlimitedCount = approvals.filter((a) => a.unlimited).length;

  let usdTotal = 0;
  let pricedCount = 0;
  let unpricedCount = 0;
  let anyPrice = false;

  for (const a of approvals) {
    // Permit2 sub-allowances pull the same tokens the outer Permit2
    // approval already counts, so they never add to the total.
    if (!isFungibleKind(a.kind) || a.kind === "permit2") {
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

  const openTitle =
    noun === "delegate"
      ? openCount === 1
        ? "1 OPEN DELEGATE"
        : `${openCount} OPEN DELEGATES`
      : openCount === 1
        ? "1 OPEN ALLOWANCE"
        : `${openCount} OPEN ALLOWANCES`;

  return {
    title: openTitle,
    hasUsd: false,
    usdTotal: null,
    openCount,
    unlimitedCount,
    pricedCount,
    unpricedCount,
  };
}

function inferHeadlineNoun(approvals: readonly OpenApproval[]): HeadlineNoun {
  if (approvals.some((a) => a.kind === "spl-delegate" || a.kind === "spl-permanent-delegate")) {
    return "delegate";
  }
  return "allowance";
}

export const POSTER_QUOTE =
  "Still movable if these spenders turn hostile.";

export const SOLANA_POSTER_QUOTE =
  "Still movable if these delegates turn hostile.";

export function posterQuote(noun: HeadlineNoun | "evm" | "solana" = "allowance"): string {
  if (noun === "delegate" || noun === "solana") {
    return SOLANA_POSTER_QUOTE;
  }
  return POSTER_QUOTE;
}
