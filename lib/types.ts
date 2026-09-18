import type { ChainId, ChainSlug } from "./chains";

export type ApprovalKind = "erc20" | "erc721-for-all";

export type RankableApproval = {
  id: string;
  kind: ApprovalKind;
  unlimited: boolean;
  movable: bigint;
  balance: bigint;
  decimals: number;
  usdMovable: number | null;
};

export type OpenApproval = RankableApproval & {
  token: string;
  tokenSymbol: string;
  tokenName: string;
  spender: string;
  spenderLabel: string;
  allowance: bigint;
  usdPrice: number | null;
};

export type Headline = {
  /** Primary poster line. Never a fabricated dollar amount. */
  title: string;
  /** True only when `title` is backed by live token prices. */
  hasUsd: boolean;
  usdTotal: number | null;
  openCount: number;
  unlimitedCount: number;
  pricedCount: number;
  unpricedCount: number;
};

export type ScanSources = {
  logs: boolean;
  etherscan: boolean;
  probe: boolean;
};

export type ScanResult = {
  query: string;
  address: string;
  ens: string | null;
  chainId: ChainId;
  chain: ChainSlug;
  chainName: string;
  scannedAt: number;
  partial: boolean;
  earliestBlock: string | null;
  latestBlock: string;
  fromBlock: string | null;
  approvals: OpenApproval[];
  headline: Headline;
  sources: ScanSources;
  warnings: string[];
};

export type ScanErrorCode = "invalid" | "unresolved" | "rpc";
