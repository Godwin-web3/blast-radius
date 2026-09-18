import { describe, expect, it } from "vitest";
import {
  CHAINS,
  CHAIN_LIST,
  ChainPathError,
  DEFAULT_CHAIN_SLUG,
  EVM_CHAINS,
  getChain,
  getChainById,
  isEvmChain,
  isSolanaChain,
  parseChainSlug,
  parseWalletPath,
  rpcUrlsFor,
  walletPath,
} from "@/lib/chains";
import { CATALOGS, PERMIT2, labelSpender } from "@/lib/known";

describe("chain registry", () => {
  it("maps ethereum, base, arbitrum one, and solana", () => {
    expect(CHAINS.ethereum.chainId).toBe(1);
    expect(CHAINS.base.chainId).toBe(8453);
    expect(CHAINS.arbitrum.chainId).toBe(42161);
    expect(CHAINS.solana.chainId).toBe("solana");
    expect(CHAINS.ethereum.family).toBe("evm");
    expect(CHAINS.solana.family).toBe("solana");
    expect(CHAINS.ethereum.etherscanChainId).toBe("1");
    expect(CHAINS.base.etherscanChainId).toBe("8453");
    expect(CHAINS.arbitrum.etherscanChainId).toBe("42161");
    expect(CHAIN_LIST).toHaveLength(4);
    expect(EVM_CHAINS).toHaveLength(3);
  });

  it("uses one Etherscan v2 chainid field per EVM network", () => {
    for (const chain of CHAIN_LIST.filter(isEvmChain)) {
      expect(chain.etherscanChainId).toBe(String(chain.chainId));
    }
    expect(isSolanaChain(CHAINS.solana)).toBe(true);
    expect("etherscanChainId" in CHAINS.solana).toBe(false);
  });

  it("parses aliases", () => {
    expect(parseChainSlug("ETH")).toBe("ethereum");
    expect(parseChainSlug("mainnet")).toBe("ethereum");
    expect(parseChainSlug("base")).toBe("base");
    expect(parseChainSlug("arb")).toBe("arbitrum");
    expect(parseChainSlug("arbitrum-one")).toBe("arbitrum");
    expect(parseChainSlug("solana")).toBe("solana");
    expect(parseChainSlug("SOL")).toBe("solana");
    expect(parseChainSlug("polygon")).toBeNull();
  });

  it("defaults getChain to ethereum", () => {
    expect(getChain(null).slug).toBe(DEFAULT_CHAIN_SLUG);
    expect(getChain(undefined).chainId).toBe(1);
    expect(getChainById(8453)?.slug).toBe("base");
    expect(getChainById("solana")?.slug).toBe("solana");
    expect(getChainById(10)).toBeNull();
  });

  it("prepends a dedicated RPC URL when the chain env is set", () => {
    const prev = process.env.BASE_RPC_URL;
    process.env.BASE_RPC_URL = "https://example.invalid/base";
    try {
      const urls = rpcUrlsFor(CHAINS.base);
      expect(urls[0]).toBe("https://example.invalid/base");
      expect(urls.slice(1)).toEqual([...CHAINS.base.publicRpcs]);
    } finally {
      if (prev === undefined) {
        delete process.env.BASE_RPC_URL;
      } else {
        process.env.BASE_RPC_URL = prev;
      }
    }
  });

  it("prepends SOLANA_RPC and optional Helius JSON-RPC", () => {
    const prevRpc = process.env.SOLANA_RPC;
    const prevHelius = process.env.HELIUS_API_KEY;
    process.env.SOLANA_RPC = "https://example.invalid/solana";
    process.env.HELIUS_API_KEY = "test-key";
    try {
      const urls = rpcUrlsFor(CHAINS.solana);
      expect(urls[0]).toBe("https://example.invalid/solana");
      expect(urls[1]).toBe("https://mainnet.helius-rpc.com/?api-key=test-key");
      expect(urls).toContain(CHAINS.solana.publicRpcs[0]);
    } finally {
      if (prevRpc === undefined) {
        delete process.env.SOLANA_RPC;
      } else {
        process.env.SOLANA_RPC = prevRpc;
      }
      if (prevHelius === undefined) {
        delete process.env.HELIUS_API_KEY;
      } else {
        process.env.HELIUS_API_KEY = prevHelius;
      }
    }
  });
});

describe("wallet path encoding", () => {
  it("treats a single segment as ethereum (back-compat)", () => {
    const parsed = parseWalletPath(["vitalik.eth"]);
    expect(parsed.chain.slug).toBe("ethereum");
    expect(parsed.query).toBe("vitalik.eth");
  });

  it("decodes a checksum address on an explicit chain", () => {
    const addr = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    const parsed = parseWalletPath(["base", encodeURIComponent(addr)]);
    expect(parsed.chain.slug).toBe("base");
    expect(parsed.query).toBe(addr);
  });

  it("accepts arb as an alias in the URL", () => {
    const parsed = parseWalletPath(["arb", "vitalik.eth"]);
    expect(parsed.chain.slug).toBe("arbitrum");
    expect(parsed.query).toBe("vitalik.eth");
  });

  it("encodes /w/solana/[base58] as Solana", () => {
    const addr = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    const parsed = parseWalletPath(["solana", addr]);
    expect(parsed.chain.slug).toBe("solana");
    expect(parsed.chain.family).toBe("solana");
    expect(parsed.query).toBe(addr);
    expect(walletPath("solana", addr)).toBe(`/w/solana/${encodeURIComponent(addr)}`);
    expect(() => parseWalletPath(["solana"])).toThrow(ChainPathError);
  });

  it("rejects a chain slug with no wallet", () => {
    expect(() => parseWalletPath(["base"])).toThrow(ChainPathError);
    try {
      parseWalletPath(["base"]);
    } catch (err) {
      expect(err).toBeInstanceOf(ChainPathError);
      expect((err as ChainPathError).code).toBe("missing-wallet");
    }
  });

  it("rejects unknown chains in /w/[chain]/[address]", () => {
    expect(() => parseWalletPath(["polygon", "vitalik.eth"])).toThrow(/Unknown chain/);
  });

  it("builds canonical share URLs that always include the chain", () => {
    expect(walletPath("ethereum", "vitalik.eth")).toBe("/w/ethereum/vitalik.eth");
    expect(walletPath("base", "vitalik.eth")).toBe("/w/base/vitalik.eth");
    expect(walletPath(CHAINS.arbitrum, " 0xabc ")).toBe("/w/arbitrum/0xabc");
    expect(walletPath("solana", "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM")).toBe(
      "/w/solana/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    );
    const encoded = walletPath("base", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    expect(encoded.startsWith("/w/base/")).toBe(true);
    expect(encoded).not.toBe("/w/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  });

  it("round-trips encodeURIComponent queries", () => {
    const q = "vitalik.eth";
    const path = walletPath("base", q);
    const segments = path.slice(3).split("/");
    const parsed = parseWalletPath(segments);
    expect(parsed.chain.slug).toBe("base");
    expect(parsed.query).toBe(q);
  });
});

describe("known spenders per chain", () => {
  it("labels Permit2 on every chain at the canonical CREATE2 address", () => {
    expect(labelSpender(PERMIT2, 1)).toBe("Uniswap Permit2");
    expect(labelSpender(PERMIT2, 8453)).toBe("Uniswap Permit2");
    expect(labelSpender(PERMIT2, 42161)).toBe("Uniswap Permit2");
  });

  it("does not reuse L1 USDC on Base or Arbitrum", () => {
    const l1Usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48".toLowerCase();
    const baseUsdc = CATALOGS[8453].tokens.find((t) => t.symbol === "USDC");
    const arbUsdc = CATALOGS[42161].tokens.find((t) => t.symbol === "USDC");
    expect(baseUsdc?.address.toLowerCase()).not.toBe(l1Usdc);
    expect(arbUsdc?.address.toLowerCase()).not.toBe(l1Usdc);
    expect(baseUsdc?.address.toLowerCase()).toBe(
      "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    );
    expect(arbUsdc?.address.toLowerCase()).toBe(
      "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    );
  });

  it("labels chain-specific routers where addresses differ", () => {
    expect(labelSpender("0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43", 8453)).toMatch(
      /Aerodrome/,
    );
    expect(labelSpender("0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43", 1)).not.toMatch(
      /Aerodrome/,
    );
    expect(labelSpender("0xc873fEcbd354f5A56E00E710B90EF4201db2448d", 42161)).toMatch(
      /Camelot/,
    );
    expect(labelSpender("0xaBBc5F99639c9B6bCb58544ddf04EFA6802F2861", 42161)).toMatch(/GMX/);
  });
});
