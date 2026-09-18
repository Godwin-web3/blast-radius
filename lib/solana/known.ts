import { truncatePubkey } from "./address";

export type KnownSplToken = {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
};

export type KnownDelegate = {
  address: string;
  label: string;
};

/** High-circulation mainnet mints for symbol fallback when metadata is missing. */
export const KNOWN_SPL_TOKENS: readonly KnownSplToken[] = [
  {
    mint: "So11111111111111111111111111111111111111112",
    symbol: "SOL",
    name: "Wrapped SOL",
    decimals: 9,
  },
  {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
  {
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
  },
  {
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    symbol: "JUP",
    name: "Jupiter",
    decimals: 6,
  },
  {
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "BONK",
    name: "Bonk",
    decimals: 5,
  },
  {
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    symbol: "WIF",
    name: "dogwifhat",
    decimals: 6,
  },
  {
    mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    symbol: "PYTH",
    name: "Pyth Network",
    decimals: 6,
  },
  {
    mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    symbol: "JitoSOL",
    name: "Jito Staked SOL",
    decimals: 9,
  },
  {
    mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    symbol: "mSOL",
    name: "Marinade staked SOL",
    decimals: 9,
  },
  {
    mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    symbol: "RAY",
    name: "Raydium",
    decimals: 6,
  },
  {
    mint: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    symbol: "WETH",
    name: "Wrapped Ether (Wormhole)",
    decimals: 8,
  },
  {
    mint: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    symbol: "WBTC",
    name: "Wrapped BTC (Wormhole)",
    decimals: 8,
  },
];

const TOKEN_BY_MINT = new Map(KNOWN_SPL_TOKENS.map((t) => [t.mint, t]));

/** Program IDs that sometimes show up as token-account delegates. Labels only — not risk scores. */
export const KNOWN_DELEGATES: readonly KnownDelegate[] = [
  { address: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", label: "Jupiter" },
  { address: "jupoQqCaqFKW4TPjTuGUN2KSgfbzX5E6vJ6yefyYT1F", label: "Jupiter Limit" },
  { address: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", label: "Raydium AMM" },
  { address: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", label: "Raydium CLMM" },
  { address: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", label: "Orca Whirlpool" },
  { address: "TSWAPaqyCSx2KABk68Shruf4mp7oLu6qyNVsCJmeqP", label: "Tensor Swap" },
  { address: "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K", label: "Magic Eden" },
  { address: "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH", label: "Drift" },
  { address: "KLend2g3cP87err7VWj3r62KLv2pq4DeoTxwKzNFdM", label: "Kamino Lend" },
];

const DELEGATE_BY_ADDRESS = new Map(KNOWN_DELEGATES.map((d) => [d.address, d.label]));

export function knownSplToken(mint: string): KnownSplToken | undefined {
  return TOKEN_BY_MINT.get(mint.trim());
}

export function labelDelegate(address: string): string {
  return DELEGATE_BY_ADDRESS.get(address.trim()) ?? truncatePubkey(address, 4);
}
