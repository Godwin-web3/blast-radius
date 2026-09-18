import { describe, expect, it } from "vitest";
import { buildHeadline, formatUsdCompact } from "@/lib/headline";
import { MAX_UINT256 } from "@/lib/unlimited";
import type { OpenApproval } from "@/lib/types";

function approval(partial: Partial<OpenApproval> & Pick<OpenApproval, "id">): OpenApproval {
  return {
    kind: "erc20",
    token: "0x0000000000000000000000000000000000000001",
    tokenSymbol: "TKN",
    tokenName: "Token",
    decimals: 18,
    spender: "0x0000000000000000000000000000000000000002",
    spenderLabel: "Spender",
    allowance: 0n,
    balance: 0n,
    movable: 0n,
    unlimited: false,
    usdMovable: null,
    usdPrice: null,
    ...partial,
  };
}

describe("buildHeadline", () => {
  it("says CLEAN when nothing is open", () => {
    const h = buildHeadline([]);
    expect(h.title).toBe("CLEAN");
    expect(h.hasUsd).toBe(false);
    expect(h.usdTotal).toBeNull();
  });

  it("uses a real USD total when prices exist", () => {
    const h = buildHeadline([
      approval({
        id: "1",
        movable: 10n ** 6n,
        balance: 10n ** 6n,
        usdMovable: 1_250_000,
        usdPrice: 1,
        unlimited: true,
        allowance: MAX_UINT256,
      }),
    ]);
    expect(h.hasUsd).toBe(true);
    expect(h.title).toContain("EXPOSED");
    expect(h.title.startsWith("$")).toBe(true);
    expect(h.usdTotal).toBe(1_250_000);
  });

  it("does not invent dollars when prices are missing", () => {
    const h = buildHeadline([
      approval({
        id: "1",
        unlimited: true,
        allowance: MAX_UINT256,
        movable: 10n ** 18n,
        balance: 10n ** 18n,
        usdMovable: null,
        usdPrice: null,
      }),
    ]);
    expect(h.hasUsd).toBe(false);
    expect(h.usdTotal).toBeNull();
    expect(h.title).toBe("UNLIMITED");
    expect(h.title.includes("$")).toBe(false);
  });

  it("says OPEN DELEGATES for limited Solana rows", () => {
    const h = buildHeadline(
      [
        approval({
          id: "spl",
          kind: "spl-delegate",
          token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          spender: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
          allowance: 100n,
          movable: 100n,
          balance: 100n,
          decimals: 6,
        }),
      ],
      { noun: "delegate" },
    );
    expect(h.title).toBe("1 OPEN DELEGATE");
    expect(h.hasUsd).toBe(false);
  });

  it("labels mixed priced/unpriced honestly", () => {
    const h = buildHeadline([
      approval({
        id: "priced",
        movable: 1n,
        usdMovable: 100,
        usdPrice: 100,
      }),
      approval({
        id: "unpriced",
        movable: 5n,
        usdMovable: null,
        usdPrice: null,
      }),
    ]);
    expect(h.hasUsd).toBe(true);
    expect(h.title).toContain("PRICED");
    expect(h.unpricedCount).toBe(1);
  });
});

describe("formatUsdCompact", () => {
  it("compacts thousands and millions", () => {
    expect(formatUsdCompact(1200)).toBe("$1.2K");
    expect(formatUsdCompact(1_250_000)).toBe("$1.3M");
  });
});
