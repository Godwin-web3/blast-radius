import { arbitrum, base, mainnet, type Chain } from "viem/chains";

export type ChainSlug = "ethereum" | "base" | "arbitrum";

export type ChainId = 1 | 8453 | 42161;

export type SupportedChain = {
  slug: ChainSlug;
  chainId: ChainId;
  /** Etherscan v2 `chainid` query param — one API key covers all three. */
  etherscanChainId: `${ChainId}`;
  name: string;
  shortName: string;
  posterKicker: string;
  nativeSymbol: "ETH";
  explorer: {
    name: string;
    addressUrl: (address: string) => string;
  };
  coingeckoPlatform: "ethereum" | "base" | "arbitrum-one";
  viemChain: Chain;
  rpcEnv: string;
  publicRpcs: readonly string[];
  revokeCashUrl: (address: string) => string;
};

const ETHEREUM: SupportedChain = {
  slug: "ethereum",
  chainId: 1,
  etherscanChainId: "1",
  name: "Ethereum",
  shortName: "ETH",
  posterKicker: "ETHEREUM",
  nativeSymbol: "ETH",
  explorer: {
    name: "Etherscan",
    addressUrl: (address) => `https://etherscan.io/address/${address}`,
  },
  coingeckoPlatform: "ethereum",
  viemChain: mainnet,
  rpcEnv: "RPC_URL",
  publicRpcs: [
    "https://ethereum-rpc.publicnode.com",
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
    "https://1rpc.io/eth",
    "https://cloudflare-eth.com",
    "https://eth.drpc.org",
  ],
  revokeCashUrl: (address) => `https://revoke.cash/address/${address}?chainId=1`,
};

const BASE: SupportedChain = {
  slug: "base",
  chainId: 8453,
  etherscanChainId: "8453",
  name: "Base",
  shortName: "Base",
  posterKicker: "BASE",
  nativeSymbol: "ETH",
  explorer: {
    name: "Basescan",
    addressUrl: (address) => `https://basescan.org/address/${address}`,
  },
  coingeckoPlatform: "base",
  viemChain: base,
  rpcEnv: "BASE_RPC_URL",
  publicRpcs: [
    "https://base-rpc.publicnode.com",
    "https://mainnet.base.org",
    "https://base.llamarpc.com",
    "https://1rpc.io/base",
    "https://base.drpc.org",
    "https://rpc.ankr.com/base",
  ],
  revokeCashUrl: (address) => `https://revoke.cash/address/${address}?chainId=8453`,
};

const ARBITRUM: SupportedChain = {
  slug: "arbitrum",
  chainId: 42161,
  etherscanChainId: "42161",
  name: "Arbitrum One",
  shortName: "Arb",
  posterKicker: "ARBITRUM",
  nativeSymbol: "ETH",
  explorer: {
    name: "Arbiscan",
    addressUrl: (address) => `https://arbiscan.io/address/${address}`,
  },
  coingeckoPlatform: "arbitrum-one",
  viemChain: arbitrum,
  rpcEnv: "ARBITRUM_RPC_URL",
  publicRpcs: [
    "https://arbitrum-one-rpc.publicnode.com",
    "https://arb1.arbitrum.io/rpc",
    "https://arbitrum.llamarpc.com",
    "https://1rpc.io/arb",
    "https://arbitrum.drpc.org",
    "https://rpc.ankr.com/arbitrum",
  ],
  revokeCashUrl: (address) => `https://revoke.cash/address/${address}?chainId=42161`,
};

export const CHAINS: Record<ChainSlug, SupportedChain> = {
  ethereum: ETHEREUM,
  base: BASE,
  arbitrum: ARBITRUM,
};

export const CHAIN_LIST: readonly SupportedChain[] = [
  ETHEREUM,
  BASE,
  ARBITRUM,
];

export const DEFAULT_CHAIN_SLUG: ChainSlug = "ethereum";

const SLUG_ALIASES: Record<string, ChainSlug> = {
  ethereum: "ethereum",
  eth: "ethereum",
  mainnet: "ethereum",
  ether: "ethereum",
  base: "base",
  arbitrum: "arbitrum",
  arb: "arbitrum",
  "arbitrum-one": "arbitrum",
  arbitrumone: "arbitrum",
  "arbitrum_one": "arbitrum",
};

export function parseChainSlug(raw: string | null | undefined): ChainSlug | null {
  if (!raw) {
    return null;
  }
  const key = raw.trim().toLowerCase();
  return SLUG_ALIASES[key] ?? null;
}

export function getChain(slug: ChainSlug | string | null | undefined): SupportedChain {
  const parsed = parseChainSlug(slug ?? DEFAULT_CHAIN_SLUG);
  if (!parsed) {
    throw new ChainPathError("unknown-chain", `Unknown chain: ${slug ?? ""}`);
  }
  return CHAINS[parsed];
}

export function getChainById(chainId: number): SupportedChain | null {
  return CHAIN_LIST.find((c) => c.chainId === chainId) ?? null;
}

export class ChainPathError extends Error {
  readonly code: "unknown-chain" | "missing-wallet" | "invalid-path";
  constructor(code: "unknown-chain" | "missing-wallet" | "invalid-path", message: string) {
    super(message);
    this.code = code;
    this.name = "ChainPathError";
  }
}

export type WalletPath = {
  chain: SupportedChain;
  query: string;
};

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Share URLs:
 *   /w/[address]                 → Ethereum (back-compat)
 *   /w/[chain]/[address]         → explicit chain (canonical)
 *
 * A lone chain slug (`/w/base`) is a missing-wallet error, not an address.
 */
export function parseWalletPath(segments: readonly string[]): WalletPath {
  if (segments.length === 0) {
    throw new ChainPathError("missing-wallet", "Paste a 0x address or ENS name.");
  }
  if (segments.length === 1) {
    const only = decodeSegment(segments[0] ?? "");
    const asChain = parseChainSlug(only);
    if (asChain && !only.includes(".")) {
      throw new ChainPathError(
        "missing-wallet",
        `Pick ${CHAINS[asChain].name}, then paste a wallet.`,
      );
    }
    return { chain: CHAINS.ethereum, query: only };
  }
  if (segments.length === 2) {
    const slug = parseChainSlug(segments[0]);
    if (!slug) {
      throw new ChainPathError(
        "unknown-chain",
        `Unknown chain "${segments[0]}". Use ethereum, base, or arbitrum.`,
      );
    }
    const query = decodeSegment(segments[1] ?? "").trim();
    if (!query) {
      throw new ChainPathError("missing-wallet", "Paste a 0x address or ENS name.");
    }
    return { chain: CHAINS[slug], query };
  }
  throw new ChainPathError("invalid-path", "Use /w/[address] or /w/[chain]/[address].");
}

/** Canonical share path — always includes the chain so quotes are unambiguous. */
export function walletPath(chain: ChainSlug | SupportedChain, query: string): string {
  const slug = typeof chain === "string" ? getChain(chain).slug : chain.slug;
  return `/w/${slug}/${encodeURIComponent(query.trim())}`;
}

export function rpcUrlsFor(chain: SupportedChain): string[] {
  const custom = process.env[chain.rpcEnv]?.trim();
  const publics = [...chain.publicRpcs];
  if (!custom) {
    return publics;
  }
  return [custom, ...publics.filter((u) => u !== custom)];
}
