import { describe, expect, it } from "vitest";
import { cacheKey } from "@/lib/cache";

describe("scan cache keys", () => {
  it("namespaces queries by chain so Base cannot reuse an Ethereum result", () => {
    expect(cacheKey("ethereum", "vitalik.eth")).toBe("ethereum:vitalik.eth");
    expect(cacheKey("base", "vitalik.eth")).toBe("base:vitalik.eth");
    expect(cacheKey("ethereum", " 0xAbC ")).toBe("ethereum:0xabc");
    expect(cacheKey("ethereum", "vitalik.eth")).not.toBe(
      cacheKey("arbitrum", "vitalik.eth"),
    );
    const sol = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    expect(cacheKey("solana", sol)).toBe(`solana:${sol}`);
    expect(cacheKey("solana", sol)).not.toBe(cacheKey("solana", sol.toLowerCase()));
  });
});
