/**
 * Reverse spender exposure index.
 *
 * The forward scan answers "what can touch my wallet?". This answers the
 * inverse: "if this spender's controller turns hostile, how much can it
 * move from everyone, right now?". Built nightly by scripts/index/run.ts
 * (GitHub Actions) and published as JSON on the `index-data` branch.
 */
import { getAddress } from "viem";

export type IndexedToken = { symbol: string; address: string; usd: number; wallets: number };
export type IndexedWallet = { address: string; usd: number; isContract?: boolean };

export type IndexedSpender = {
  address: string;
  label: string;
  chain: "ethereum";
  grade: string;
  summary: string;
  controller: { address: string; kind: string; label?: string } | null;
  /** USD that can be moved right now: sum of min(allowance, balance) × price. */
  movableUsd: number;
  wallets: number;
  livePairs: number;
  unlimitedLivePairs: number;
  /** Pairs whose token has no trusted price. Counted, never valued. */
  unpricedPairs: number;
  approvalEvents: number;
  /** Pairs whose last Approval event was non-zero (what event-only tools show). */
  eventNonzeroPairs: number;
  topTokens: IndexedToken[];
  topWallets: IndexedWallet[];
  /** Block the on-chain verification ran against. */
  block: number;
  updatedAt: string;
};

export type SpenderIndex = {
  version: 1;
  generatedAt: string;
  chain: "ethereum";
  spenders: IndexedSpender[];
  /** Spenders graded A: no key to compromise, so deliberately not indexed. */
  skipped: { address: string; label: string; grade: string }[];
};

const DEFAULT_URL =
  "https://raw.githubusercontent.com/Godwin-web3/blast-radius/index-data/index.json";

export function indexUrl(): string {
  return process.env.SPENDER_INDEX_URL || DEFAULT_URL;
}

/** Fetch the published index. Returns null on any failure: callers must degrade, never invent. */
export async function loadSpenderIndex(timeoutMs = 4000): Promise<SpenderIndex | null> {
  try {
    const res = await fetch(indexUrl(), {
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: 900 },
    } as RequestInit);
    if (!res.ok) return null;
    const json = (await res.json()) as SpenderIndex;
    return isSpenderIndex(json) ? json : null;
  } catch {
    return null;
  }
}

export function isSpenderIndex(x: unknown): x is SpenderIndex {
  const o = x as SpenderIndex;
  return !!o && o.version === 1 && Array.isArray(o.spenders);
}

export function indexByAddress(index: SpenderIndex | null): Map<string, IndexedSpender> {
  const m = new Map<string, IndexedSpender>();
  for (const s of index?.spenders ?? []) m.set(s.address.toLowerCase(), s);
  return m;
}

export function findSpender(index: SpenderIndex | null, address: string): IndexedSpender | null {
  return indexByAddress(index).get(address.toLowerCase()) ?? null;
}

/** Leaderboard order: hostility first (worse grade = higher), then dollars. */
const GRADE_RANK: Record<string, number> = { F: 0, D: 1, "?": 2, C: 3, B: 4, A: 5 };
export function rankSpenders(list: readonly IndexedSpender[]): IndexedSpender[] {
  return [...list].sort(
    (a, b) =>
      b.movableUsd * weight(b.grade) - a.movableUsd * weight(a.grade) ||
      (GRADE_RANK[a.grade] ?? 9) - (GRADE_RANK[b.grade] ?? 9),
  );
}

/** Same scale the forward ranking uses: worse controllers count for more. */
export function weight(grade: string): number {
  return { F: 1, D: 0.8, "?": 0.6, C: 0.5, B: 0.25, A: 0.05 }[grade] ?? 0.6;
}

export function safeChecksum(a: string): string {
  try {
    return getAddress(a);
  } catch {
    return a;
  }
}
