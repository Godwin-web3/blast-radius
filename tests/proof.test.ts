import { describe, expect, it } from "vitest";
import { proofUrl } from "../lib/spender-index";

describe("drain proof", () => {
  it("derives the proof url next to the index url", () => {
    expect(proofUrl("0xABC0000000000000000000000000000000000000")).toMatch(
      /proofs\/0xabc0000000000000000000000000000000000000\.json$/,
    );
  });
});
