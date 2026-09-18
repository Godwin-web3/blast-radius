import { createPublicClient, fallback, http } from "viem";
import { mainnet } from "viem/chains";

const PUBLIC_RPCS: readonly string[] = [
  "https://ethereum-rpc.publicnode.com",
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
  "https://1rpc.io/eth",
  "https://cloudflare-eth.com",
  "https://eth.drpc.org",
];

function rpcList(): string[] {
  const custom = process.env.RPC_URL?.trim();
  const urls = custom ? [custom, ...PUBLIC_RPCS.filter((u) => u !== custom)] : [...PUBLIC_RPCS];
  return urls;
}

export function getMainnetClient() {
  const transports = rpcList().map((url) =>
    http(url, {
      timeout: 14_000,
      retryCount: 1,
      retryDelay: 400,
    }),
  );
  return createPublicClient({
    chain: mainnet,
    transport: fallback(transports, { rank: false }),
  });
}

export type MainnetClient = ReturnType<typeof getMainnetClient>;

export const ETHERSCAN_V2 = "https://api.etherscan.io/v2/api";
