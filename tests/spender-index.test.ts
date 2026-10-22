import { describe, expect, it } from "vitest";
import { findSpender, isSpenderIndex, rankSpenders, type IndexedSpender, type SpenderIndex } from "../lib/spender-index";

const row = (address: string, grade: string, movableUsd: number): IndexedSpender => ({
  address, label: address, chain: "ethereum", grade, summary: "", controller: null, movableUsd,
  wallets: 1, livePairs: 1, unlimitedLivePairs: 0, unpricedPairs: 0, approvalEvents: 1,
  eventNonzeroPairs: 1, topTokens: [], topWallets: [], block: 1, updatedAt: "",
});

describe("spender index", () => {
  it("validates shape", () => {
    expect(isSpenderIndex({ version: 1, spenders: [] })).toBe(true);
    expect(isSpenderIndex({ version: 2, spenders: [] })).toBe(false);
    expect(isSpenderIndex(null)).toBe(false);
  });

  it("ranks hostility-weighted dollars, so a single-key spender beats a bigger multisig one", () => {
    const ranked = rankSpenders([row("0xa", "C", 3_000_000), row("0xb", "F", 2_000_000), row("0xc", "D", 100)]);
    expect(ranked.map((r) => r.address)).toEqual(["0xb", "0xa", "0xc"]);
  });

  it("finds spenders case-insensitively and returns null when the index is missing", () => {
    const idx: SpenderIndex = { version: 1, generatedAt: "", chain: "ethereum", spenders: [row("0xAbC", "C", 1)], skipped: [] };
    expect(findSpender(idx, "0xabc")?.address).toBe("0xAbC");
    expect(findSpender(null, "0xabc")).toBeNull();
  });
});
