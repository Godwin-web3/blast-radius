import { describe, expect, it } from "vitest";
import {
  MAX_UINT256,
  UNLIMITED_THRESHOLD,
  isUnlimitedAllowance,
  movableAmount,
} from "@/lib/unlimited";

describe("isUnlimitedAllowance", () => {
  it("treats max uint256 as unlimited", () => {
    expect(isUnlimitedAllowance(MAX_UINT256)).toBe(true);
  });

  it("treats 2^255 (signed max) as unlimited", () => {
    expect(isUnlimitedAllowance(1n << 255n)).toBe(true);
  });

  it("treats 1e59 sentinel as unlimited", () => {
    expect(isUnlimitedAllowance(UNLIMITED_THRESHOLD)).toBe(true);
    expect(isUnlimitedAllowance(UNLIMITED_THRESHOLD - 1n)).toBe(false);
  });

  it("does not flag ordinary allowances", () => {
    expect(isUnlimitedAllowance(0n)).toBe(false);
    expect(isUnlimitedAllowance(1n)).toBe(false);
    expect(isUnlimitedAllowance(10n ** 18n * 1_000_000n)).toBe(false);
  });

  it("rejects negative values", () => {
    expect(isUnlimitedAllowance(-1n)).toBe(false);
  });
});

describe("movableAmount", () => {
  it("returns the full balance when unlimited", () => {
    expect(movableAmount(MAX_UINT256, 123n)).toBe(123n);
  });

  it("caps at allowance when limited", () => {
    expect(movableAmount(50n, 80n)).toBe(50n);
    expect(movableAmount(90n, 80n)).toBe(80n);
  });

  it("is zero when the bag is empty even if unlimited", () => {
    expect(movableAmount(MAX_UINT256, 0n)).toBe(0n);
  });
});
