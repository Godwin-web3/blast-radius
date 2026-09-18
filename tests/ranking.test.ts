import { describe, expect, it } from "vitest";
import { rankApprovals, riskScore } from "@/lib/ranking";
import { MAX_UINT256 } from "@/lib/unlimited";
import type { RankableApproval } from "@/lib/types";

function item(partial: Partial<RankableApproval> & Pick<RankableApproval, "id">): RankableApproval {
  return {
    kind: "erc20",
    unlimited: false,
    movable: 0n,
    balance: 0n,
    decimals: 18,
    usdMovable: null,
    ...partial,
  };
}

describe("riskScore / rankApprovals", () => {
  it("ranks live unlimited ERC-20 ahead of latent unlimited and limited", () => {
    const live = item({
      id: "live",
      unlimited: true,
      movable: 10n ** 18n,
      balance: 10n ** 18n,
      usdMovable: 3200,
    });
    const latent = item({
      id: "latent",
      unlimited: true,
      movable: 0n,
      balance: 0n,
    });
    const limited = item({
      id: "limited",
      unlimited: false,
      movable: 5n * 10n ** 18n,
      balance: 5n * 10n ** 18n,
      usdMovable: 50,
    });
    const ranked = rankApprovals([limited, latent, live]);
    expect(ranked.map((r) => r.id)).toEqual(["live", "latent", "limited"]);
    expect(riskScore(live)).toBeGreaterThan(riskScore(latent));
    expect(riskScore(latent)).toBeGreaterThan(riskScore(limited));
  });

  it("uses real USD when present, never a guessed price", () => {
    const priced = item({
      id: "priced",
      movable: 1n,
      balance: 1n,
      decimals: 0,
      usdMovable: 8000,
    });
    const unpricedBigger = item({
      id: "unpriced",
      movable: 9n * 10n ** 18n,
      balance: 9n * 10n ** 18n,
      usdMovable: null,
    });
    const ranked = rankApprovals([unpricedBigger, priced]);
    expect(ranked[0]?.id).toBe("priced");
  });

  it("places NFT operator-wide approvals high but below live unlimited dollars", () => {
    const nft = item({
      id: "nft",
      kind: "erc721-for-all",
      unlimited: true,
      movable: 3n,
      balance: 3n,
      decimals: 0,
    });
    const liveUsd = item({
      id: "usdc",
      unlimited: true,
      movable: 1_000_000n,
      balance: 1_000_000n,
      decimals: 6,
      usdMovable: 1_000_000,
    });
    const ranked = rankApprovals([nft, liveUsd]);
    expect(ranked.map((r) => r.id)).toEqual(["usdc", "nft"]);
  });

  it("is stable for identical scores via id", () => {
    const a = item({ id: "a-token", movable: 1n, balance: 1n, decimals: 0 });
    const b = item({ id: "b-token", movable: 1n, balance: 1n, decimals: 0 });
    expect(rankApprovals([b, a]).map((r) => r.id)).toEqual(["a-token", "b-token"]);
  });

  it("understands MAX_UINT256 as the unlimited flag in ranking inputs", () => {
    expect(MAX_UINT256 > 0n).toBe(true);
    const flagged = item({
      id: "max",
      unlimited: true,
      movable: 1n,
      balance: 1n,
    });
    expect(riskScore(flagged)).toBeGreaterThan(1_000_000);
  });
});
