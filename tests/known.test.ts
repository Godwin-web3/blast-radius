import { describe, expect, it } from "vitest";
import { CHAINS } from "../lib/chains";
import { catalogFor } from "../lib/known";

describe("known catalogs", () => {
  for (const slug of ["ethereum", "base", "arbitrum"] as const) {
    it(`${slug}: no duplicate addresses in a list`, () => {
      const cat = catalogFor(CHAINS[slug] as never);
      for (const list of [cat.tokens, cat.spenders, cat.nfts, cat.operators]) {
        const seen = list.map((x) => x.address.toLowerCase());
        expect(new Set(seen).size).toBe(seen.length);
      }
    });
  }
});
