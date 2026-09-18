import { arbitrum, base, mainnet, type Chain } from "viem/chains";

export type EvmChainSlug = "ethereum" | "base" | "arbitrum";
export type ChainSlug = EvmChainSlug | "solana";
export type ChainFamily = "evm" | "solana";

export type EvmChainId = 1 | 8453 | 42161;
/** EVM numeric ids, or `"solana"` for mainnet-beta (not an EVM chainid). */
export type ChainId = EvmChainId | "solana";

type ChainCommon = {
  slug: ChainSlug;
  name: string;
  shortName: string;
  posterKicker: string;
  nativeSymbol: "ETH" | "SOL";
  explorer: {
    name: string;
    addressUrl: (address: string) => string;
  };
  rpcEnv: string;
  publicRpcs: readonly string[];
  /** External revoke / inspect link. EVM → revoke.cash; Solana → Solscan. */
  revokeUrl: (address: string) => string;
  revokeLabel: string;
  walletHint: string;
  exposureNoun: "allowance" | "delegate";
  exposureNounPlural: "allowances" | "delegates";
  counterparty: "spender" | "delegate";
};

export type EvmChain = ChainCommon & {
  family: "evm";
  slug: EvmChainSlug;
  chainId: EvmChainId;
  /** Etherscan v2 `chainid` query param — one API key covers all three EVM nets. */
  etherscanChainId: `${EvmChainId}`;
  nativeSymbol: "ETH";
  coingeckoPlatform: "ethereum" | "base" | "arbitrum-one";
  viemChain: Chain;
  exposureNoun: "allowance";
  exposureNounPlural: "allowances";
  counterparty: "spender";
};

export type SolanaChain = ChainCommon & {
  family: "solana";
  slug: "solana";
  chainId: "solana";
  nativeSymbol: "SOL";
  coingeckoPlatform: "solana";
  exposureNoun: "delegate";
  exposureNounPlural: "delegates";
  counterparty: "delegate";
};

export type SupportedChain = EvmChain | SolanaChain;

const ETHEREUM: EvmChain = {
  family: "evm",
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
  revokeUrl: (address) => `https://revoke.cash/address/${address}?chainId=1`,
  revokeLabel: "Revoke on revoke.cash",
  walletHint: "Paste a 0x address or ENS name.",
  exposureNoun: "allowance",
  exposureNounPlural: "allowances",
  counterparty: "spender",
};

const BASE: EvmChain = {
  family: "evm",
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
  revokeUrl: (address) => `https://revoke.cash/address/${address}?chainId=8453`,
  revokeLabel: "Revoke on revoke.cash",
  walletHint: "Paste a 0x address or ENS name.",
  exposureNoun: "allowance",
  exposureNounPlural: "allowances",
  counterparty: "spender",
};

const ARBITRUM: EvmChain = {
  family: "evm",
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
  revokeUrl: (address) => `https://revoke.cash/address/${address}?chainId=42161`,
  revokeLabel: "Revoke on revoke.cash",
  walletHint: "Paste a 0x address or ENS name.",
  exposureNoun: "allowance",
  exposureNounPlural: "allowances",
  counterparty: "spender",
};

const SOLANA: SolanaChain = {
  family: "solana",
  slug: "solana",
  chainId: "solana",
  name: "Solana",
  shortName: "SOL",
  posterKicker: "SOLANA",
  nativeSymbol: "SOL",
  explorer: {
    name: "Solscan",
    addressUrl: (address) => `https://solscan.io/account/${address}`,
  },
  coingeckoPlatform: "solana",
  rpcEnv: "SOLANA_RPC",
  publicRpcs: [
    "https://solana-rpc.publicnode.com",
    "https://api.mainnet-beta.solana.com",
    "https://rpc.ankr.com/solana",
    "https://1rpc.io/solana",
    "https://solana.drpc.org",
  ],
  revokeUrl: (address) => `https://solscan.io/account/${address}#portfolio`,
  revokeLabel: "View on Solscan",
  walletHint: "Paste a Solana base58 address.",
  exposureNoun: "delegate",
  exposureNounPlural: "delegates",
  counterparty: "delegate",
};

export const CHAINS = {
  ethereum: ETHEREUM,
  base: BASE,
  arbitrum: ARBITRUM,
  solana: SOLANA,
} as const satisfies Record<ChainSlug, SupportedChain>;

export const CHAIN_LIST: readonly SupportedChain[] = [
  ETHEREUM,
  BASE,
  ARBITRUM,
  SOLANA,
];

export const EVM_CHAINS: readonly EvmChain[] = [ETHEREUM, BASE, ARBITRUM];

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
  arbitrum_one: "arbitrum",
  solana: "solana",
  sol: "solana",
};

export function parseChainSlug(raw: string | null | undefined): ChainSlug | null {
  if (!raw) {
    return null;
  }
  const key = raw.trim().toLowerCase();
  return SLUG_ALIASES[key] ?? null;
}

export function isEvmChain(chain: SupportedChain): chain is EvmChain {
  return chain.family === "evm";
}

export function isSolanaChain(chain: SupportedChain): chain is SolanaChain {
  return chain.family === "solana";
}

export function getChain(slug: ChainSlug | string | null | undefined): SupportedChain {
  const parsed = parseChainSlug(slug ?? DEFAULT_CHAIN_SLUG);
  if (!parsed) {
    throw new ChainPathError("unknown-chain", `Unknown chain: ${slug ?? ""}`);
  }
  return CHAINS[parsed];
}

export function getChainById(chainId: number | "solana"): SupportedChain | null {
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
 * A lone chain slug (`/w/base`, `/w/solana`) is a missing-wallet error, not an address.
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
        `Unknown chain "${segments[0]}". Use ethereum, base, arbitrum, or solana.`,
      );
    }
    const query = decodeSegment(segments[1] ?? "").trim();
    if (!query) {
      throw new ChainPathError("missing-wallet", CHAINS[slug].walletHint);
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

function heliusRpcUrl(): string | null {
  const key = process.env.HELIUS_API_KEY?.trim();
  if (!key) {
    return null;
  }
  return `https://mainnet.helius-rpc.com/?api-key=${key}`;
}

export function rpcUrlsFor(chain: SupportedChain): string[] {
  const custom = process.env[chain.rpcEnv]?.trim();
  const extras: string[] = [];
  if (chain.family === "solana") {
    const helius = heliusRpcUrl();
    if (helius) {
      extras.push(helius);
    }
  }
  const publics = [...extras, ...chain.publicRpcs];
  const uniquePublics = publics.filter((url, i) => publics.indexOf(url) === i);
  if (!custom) {
    return uniquePublics;
  }
  return [custom, ...uniquePublics.filter((u) => u !== custom)];
}
