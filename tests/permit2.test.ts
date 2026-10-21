import { describe, expect, it } from "vitest";
import { isLivePermit2, isUnlimitedPermit2, MAX_UINT160, permit2Movable } from "../lib/permit2";

describe("permit2", () => {
  it("treats uint160 max as unlimited", () => {
    expect(isUnlimitedPermit2(MAX_UINT160)).toBe(true);
    expect(isUnlimitedPermit2(10n ** 18n)).toBe(false);
  });

  it("expired or zero sub-allowances are not live", () => {
    expect(isLivePermit2({ amount: 5n, expiration: 100 }, 200)).toBe(false);
    expect(isLivePermit2({ amount: 0n, expiration: 300 }, 200)).toBe(false);
    expect(isLivePermit2({ amount: 5n, expiration: 300 }, 200)).toBe(true);
  });

  it("movable is min(sub, outer, balance)", () => {
    expect(permit2Movable(MAX_UINT160, 0n, 100n, true)).toBe(100n);
    expect(permit2Movable(30n, 0n, 100n, true)).toBe(30n);
    expect(permit2Movable(MAX_UINT160, 40n, 100n, false)).toBe(40n);
    expect(permit2Movable(MAX_UINT160, 40n, 0n, false)).toBe(0n);
  });
});
