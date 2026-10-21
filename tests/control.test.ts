import { describe, expect, it } from "vitest";
import {
  buildProfile,
  controllerHostility,
  gradeFor,
  parse1167,
  parse7702,
  slotToAddress,
} from "../lib/control";
import { controlWeight, rankApprovals } from "../lib/ranking";
import type { RankableApproval } from "../lib/types";

const A = "0x1111111111111111111111111111111111111111" as const;
const B = "0x2222222222222222222222222222222222222222" as const;

describe("bytecode / slot parsing", () => {
  it("reads an address out of a storage word", () => {
    expect(slotToAddress(`0x000000000000000000000000${A.slice(2)}`)).toBe(A);
    expect(slotToAddress(`0x${"0".repeat(64)}`)).toBeNull();
    expect(slotToAddress("0x")).toBeNull();
  });

  it("detects EIP-7702 delegation designators", () => {
    expect(parse7702(`0xef0100${B.slice(2)}`)).toBe(B);
    expect(parse7702("0x6080604052")).toBeNull();
  });

  it("detects EIP-1167 minimal proxies", () => {
    const code = `0x363d3d373d3d3d363d73${A.slice(2)}5af43d82803e903d91602b57fd5bf3` as const;
    expect(parse1167(code)).toBe(A);
    expect(parse1167("0x6080604052")).toBeNull();
  });
});

describe("control grading", () => {
  it("an EOA spender is an F", () => {
    const p = buildProfile({
      address: A,
      shape: "eoa",
      implementation: null,
      controller: { address: A, kind: "eoa" },
      controllerRole: "key",
      verified: null,
    });
    expect(p.grade).toBe("F");
    expect(p.hostility).toBe(1);
  });

  it("upgradeable behind one EOA is an F, behind a long timelock is a B or better", () => {
    const eoa = buildProfile({
      address: A,
      shape: "upgradeable",
      implementation: B,
      controller: { address: B, kind: "eoa" },
      controllerRole: "upgrade",
      verified: true,
    });
    expect(eoa.grade).toBe("F");
    const tl = buildProfile({
      address: A,
      shape: "upgradeable",
      implementation: B,
      controller: { address: B, kind: "timelock", minDelaySec: 8 * 86_400 },
      controllerRole: "upgrade",
      verified: true,
    });
    expect(["A", "B"]).toContain(tl.grade);
  });

  it("1-of-n Safe upgrade admin is as bad as an EOA; 3-of-n is a C", () => {
    expect(controllerHostility({ address: B, kind: "safe", threshold: 1, owners: 3 }, "upgrade")).toBeGreaterThanOrEqual(0.85);
    expect(gradeFor(controllerHostility({ address: B, kind: "safe", threshold: 3, owners: 5 }, "upgrade"), true)).toBe("C");
  });

  it("fixed ownerless code is an A; unverified source costs a step", () => {
    const fixed = buildProfile({
      address: A,
      shape: "immutable",
      implementation: null,
      controller: null,
      controllerRole: null,
      verified: true,
    });
    expect(fixed.grade).toBe("A");
    const unverified = buildProfile({
      address: A,
      shape: "immutable",
      implementation: null,
      controller: null,
      controllerRole: null,
      verified: false,
    });
    expect(unverified.hostility).toBeGreaterThan(fixed.hostility);
    expect(unverified.flags).toContain("unverified");
  });

  it("an unreadable upgrade admin grades ?, never A", () => {
    const p = buildProfile({
      address: A,
      shape: "upgradeable",
      implementation: B,
      controller: null,
      controllerRole: "upgrade",
      verified: null,
    });
    expect(p.grade).toBe("?");
  });
});

describe("control-weighted ranking", () => {
  const base: Omit<RankableApproval, "id" | "control"> = {
    kind: "erc20",
    unlimited: true,
    movable: 10n ** 18n,
    balance: 10n ** 18n,
    decimals: 18,
    usdMovable: 1000,
  };

  it("no profile is neutral", () => {
    expect(controlWeight({ ...base, id: "x" })).toBe(1);
  });

  it("same exposure: the EOA-controlled spender outranks the immutable one", () => {
    const fixed = buildProfile({ address: A, shape: "immutable", implementation: null, controller: null, controllerRole: null, verified: true });
    const hot = buildProfile({ address: B, shape: "upgradeable", implementation: A, controller: { address: A, kind: "eoa" }, controllerRole: "upgrade", verified: true });
    const ranked = rankApprovals([
      { ...base, id: "fixed", control: fixed },
      { ...base, id: "hot", control: hot },
    ]);
    expect(ranked[0]?.id).toBe("hot");
  });
});

describe("custom proxy heuristic", () => {
  it("flags a tiny delegatecall forwarder and ignores PUSH data", async () => {
    const { looksLikeCustomProxy } = await import("../lib/control");
    expect(looksLikeCustomProxy("0x363d3df4")).toBe(true);
    // PUSH1 0xf4 then STOP: the f4 is data, not an opcode.
    expect(looksLikeCustomProxy("0x60f400")).toBe(false);
  });
});
