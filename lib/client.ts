import { createPublicClient, fallback, http, type PublicClient } from "viem";
import { CHAINS, rpcUrlsFor, type EvmChain } from "./chains";

export const ETHERSCAN_V2 = "https://api.etherscan.io/v2/api";

export function getChainClient(chain: EvmChain): PublicClient {
  const transports = rpcUrlsFor(chain).map((url) =>
    http(url, {
      timeout: 14_000,
      retryCount: 1,
      retryDelay: 400,
    }),
  );
  return createPublicClient({
    chain: chain.viemChain,
    transport: fallback(transports, { rank: false }),
  });
}

/** ENS lives on L1 even when the scan target is Base or Arbitrum. */
export function getMainnetClient(): PublicClient {
  return getChainClient(CHAINS.ethereum);
}

export type ChainClient = PublicClient;
export type MainnetClient = PublicClient;
