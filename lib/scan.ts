import {
  erc20Abi,
  erc721Abi,
  getAddress,
  parseAbiItem,
  type Address,
  type Hex,
} from "viem";
import { getCachedScan, setCachedScan } from "./cache";
import { ETHERSCAN_V2, getMainnetClient, type MainnetClient } from "./client";
import { isZeroAddress, padTopicAddress, topicToAddress } from "./format";
import { buildHeadline } from "./headline";
import {
  KNOWN_NFTS,
  KNOWN_OPERATORS,
  KNOWN_SPENDERS,
  KNOWN_TOKENS,
  knownNft,
  knownToken,
  labelSpender,
} from "./known";
import { fetchUsdPrices, usdFromAtomic } from "./prices";
import { approvalId, rankApprovals } from "./ranking";
import { resolveWallet } from "./resolve";
import type { OpenApproval, ScanResult, ScanSources } from "./types";
import { isUnlimitedAllowance, movableAmount } from "./unlimited";

const APPROVAL_TOPIC =
  "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925" as Hex;
const APPROVAL_FOR_ALL_TOPIC =
  "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31" as Hex;
const APPROVAL_EVENT = parseAbiItem(
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
);
const APPROVAL_FOR_ALL_EVENT = parseAbiItem(
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
);

const MULTICALL_CHUNK = 80;
const LOG_BUDGET_MS = 11_000;
const MAX_LOG_CALLS = 18;
const ETHERSCAN_TOKEN_CAP = 48;

type PairKind = "erc20" | "erc721-for-all";

type Pair = {
  token: Address;
  spender: Address;
  kind: PairKind;
};

function pairKey(p: Pair): string {
  return `${p.kind}:${p.token.toLowerCase()}:${p.spender.toLowerCase()}`;
}

function addPair(into: Map<string, Pair>, pair: Pair): void {
  if (isZeroAddress(pair.spender) || isZeroAddress(pair.token)) {
    return;
  }
  if (pair.token.toLowerCase() === pair.spender.toLowerCase()) {
    return;
  }
  into.set(pairKey(pair), pair);
}

type CallResult<T> =
  | { status: "success"; result: T }
  | { status: "failure"; error?: unknown };

function okResult<T>(row: CallResult<T> | undefined): T | null {
  if (row && row.status === "success") {
    return row.result;
  }
  return null;
}

async function multicallChunk<T>(
  client: MainnetClient,
  contracts: readonly Record<string, unknown>[],
): Promise<CallResult<T>[]> {
  const out: CallResult<T>[] = [];
  for (let i = 0; i < contracts.length; i += MULTICALL_CHUNK) {
    const slice = contracts.slice(i, i + MULTICALL_CHUNK);
    const rows = (await client.multicall({
      contracts: slice as never,
      allowFailure: true,
    })) as ReadonlyArray<
      { status: "success"; result: T } | { status: "failure"; error?: unknown }
    >;
    for (const row of rows) {
      if (row.status === "success") {
        out.push({ status: "success", result: row.result as T });
      } else {
        out.push({ status: "failure", error: row.error });
      }
    }
  }
  return out;
}

async function probeKnownPairs(
  client: MainnetClient,
  owner: Address,
): Promise<Map<string, Pair>> {
  const pairs = new Map<string, Pair>();
  const allowanceCalls = [];
  const allowanceMeta: Pair[] = [];
  for (const token of KNOWN_TOKENS) {
    for (const spender of KNOWN_SPENDERS) {
      allowanceCalls.push({
        address: token.address,
        abi: erc20Abi,
        functionName: "allowance" as const,
        args: [owner, spender.address] as const,
      });
      allowanceMeta.push({
        token: token.address,
        spender: spender.address,
        kind: "erc20",
      });
    }
  }

  const allowances = await multicallChunk<bigint>(client, allowanceCalls);
  allowances.forEach((row, i) => {
    const meta = allowanceMeta[i];
    const value = okResult(row);
    if (!meta || value == null || value <= 0n) {
      return;
    }
    addPair(pairs, meta);
  });

  const nftCalls = [];
  const nftMeta: Pair[] = [];
  for (const nft of KNOWN_NFTS) {
    for (const operator of KNOWN_OPERATORS) {
      nftCalls.push({
        address: nft.address,
        abi: erc721Abi,
        functionName: "isApprovedForAll" as const,
        args: [owner, operator.address] as const,
      });
      nftMeta.push({
        token: nft.address,
        spender: operator.address,
        kind: "erc721-for-all",
      });
    }
  }
  const nftRows = await multicallChunk<boolean>(client, nftCalls);
  nftRows.forEach((row, i) => {
    const meta = nftMeta[i];
    if (!meta || okResult(row) !== true) {
      return;
    }
    addPair(pairs, meta);
  });

  return pairs;
}

type LogScan = {
  pairs: Map<string, Pair>;
  fromBlock: bigint | null;
  reachedGenesis: boolean;
  calls: number;
};

async function discoverLogsRpc(
  client: MainnetClient,
  owner: Address,
  latest: bigint,
): Promise<LogScan> {
  const pairs = new Map<string, Pair>();
  let calls = 0;
  let reachedGenesis = false;
  let minFrom: bigint | null = null;
  const started = Date.now();

  const ingest = (
    logs: ReadonlyArray<{
      address: string;
      args?: { spender?: Address; operator?: Address };
    }>,
    kind: PairKind,
  ) => {
    for (const log of logs) {
      const spender = kind === "erc20" ? log.args?.spender : log.args?.operator;
      if (!spender) {
        continue;
      }
      try {
        addPair(pairs, {
          token: getAddress(log.address),
          spender: getAddress(spender),
          kind,
        });
      } catch {
        // skip malformed topics
      }
    }
  };

  const query = async (
    fromBlock: bigint,
    toBlock: bigint,
    kind: PairKind,
  ): Promise<boolean> => {
    if (calls >= MAX_LOG_CALLS) {
      return false;
    }
    if (Date.now() - started > LOG_BUDGET_MS) {
      return false;
    }
    calls += 1;
    try {
      if (kind === "erc20") {
        const logs = await client.getLogs({
          event: APPROVAL_EVENT,
          args: { owner },
          fromBlock,
          toBlock,
        });
        ingest(logs, kind);
      } else {
        const logs = await client.getLogs({
          event: APPROVAL_FOR_ALL_EVENT,
          args: { owner },
          fromBlock,
          toBlock,
        });
        ingest(logs, kind);
      }
      minFrom = minFrom == null || fromBlock < minFrom ? fromBlock : minFrom;
      return true;
    } catch {
      const span = toBlock - fromBlock;
      if (span <= 2_000n || calls >= MAX_LOG_CALLS - 1) {
        return false;
      }
      const mid = fromBlock + span / 2n;
      const left = await query(fromBlock, mid, kind);
      const right = await query(mid + 1n, toBlock, kind);
      return left && right;
    }
  };

  const fullErc20 = await query(0n, latest, "erc20");
  const fullNft = await query(0n, latest, "erc721-for-all");
  if (fullErc20 && fullNft) {
    reachedGenesis = true;
    return { pairs, fromBlock: 0n, reachedGenesis, calls };
  }

  const windows: bigint[] = [50_000n, 250_000n, 1_000_000n, 4_000_000n];
  for (const size of windows) {
    if (calls >= MAX_LOG_CALLS || Date.now() - started > LOG_BUDGET_MS) {
      break;
    }
    const from = latest > size ? latest - size : 0n;
    await query(from, latest, "erc20");
    await query(from, latest, "erc721-for-all");
    if (from === 0n) {
      reachedGenesis = true;
      break;
    }
  }

  return { pairs, fromBlock: minFrom, reachedGenesis, calls };
}

type EtherscanLog = {
  address?: string;
  topics?: string[];
};

async function etherscanJson(
  params: Record<string, string>,
): Promise<unknown> {
  const key = process.env.ETHERSCAN_API_KEY?.trim();
  if (!key) {
    return null;
  }
  const url = new URL(ETHERSCAN_V2);
  url.searchParams.set("chainid", "1");
  url.searchParams.set("apikey", key);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

function ingestEtherscanLogs(
  into: Map<string, Pair>,
  payload: unknown,
  kind: PairKind,
): number {
  if (!payload || typeof payload !== "object") {
    return 0;
  }
  const result = (payload as { result?: unknown }).result;
  if (!Array.isArray(result)) {
    return 0;
  }
  let n = 0;
  for (const row of result as EtherscanLog[]) {
    const token = row.address;
    const spenderTopic = row.topics?.[2];
    if (!token || !spenderTopic) {
      continue;
    }
    try {
      addPair(into, {
        token: getAddress(token),
        spender: getAddress(topicToAddress(spenderTopic)),
        kind,
      });
      n += 1;
    } catch {
      // ignore
    }
  }
  return n;
}

async function discoverEtherscan(
  owner: Address,
): Promise<{ pairs: Map<string, Pair>; used: boolean }> {
  const key = process.env.ETHERSCAN_API_KEY?.trim();
  const pairs = new Map<string, Pair>();
  if (!key) {
    return { pairs, used: false };
  }

  const ownerTopic = padTopicAddress(owner);
  const globalErc20 = await etherscanJson({
    module: "logs",
    action: "getLogs",
    fromBlock: "0",
    toBlock: "latest",
    topic0: APPROVAL_TOPIC,
    topic1: ownerTopic,
    topic0_1_opr: "and",
    page: "1",
    offset: "1000",
  });
  ingestEtherscanLogs(pairs, globalErc20, "erc20");

  const globalNft = await etherscanJson({
    module: "logs",
    action: "getLogs",
    fromBlock: "0",
    toBlock: "latest",
    topic0: APPROVAL_FOR_ALL_TOPIC,
    topic1: ownerTopic,
    topic0_1_opr: "and",
    page: "1",
    offset: "1000",
  });
  ingestEtherscanLogs(pairs, globalNft, "erc721-for-all");

  const txPayload = await etherscanJson({
    module: "account",
    action: "tokentx",
    address: owner,
    page: "1",
    offset: "1000",
    sort: "desc",
  });
  const tokens: string[] = [];
  const seen = new Set<string>();
  const txResult =
    txPayload && typeof txPayload === "object"
      ? (txPayload as { result?: unknown }).result
      : null;
  if (Array.isArray(txResult)) {
    for (const row of txResult as Array<{ contractAddress?: string }>) {
      const c = row.contractAddress;
      if (!c) {
        continue;
      }
      const lower = c.toLowerCase();
      if (seen.has(lower)) {
        continue;
      }
      seen.add(lower);
      tokens.push(c);
      if (tokens.length >= ETHERSCAN_TOKEN_CAP) {
        break;
      }
    }
  }

  const queue = tokens.filter((t) => {
    try {
      getAddress(t);
      return true;
    } catch {
      return false;
    }
  });

  const concurrency = 4;
  let cursor = 0;
  const run = async () => {
    while (cursor < queue.length) {
      const i = cursor;
      cursor += 1;
      const token = queue[i];
      if (!token) {
        continue;
      }
      const payload = await etherscanJson({
        module: "logs",
        action: "getLogs",
        address: token,
        fromBlock: "0",
        toBlock: "latest",
        topic0: APPROVAL_TOPIC,
        topic1: ownerTopic,
        topic0_1_opr: "and",
        page: "1",
        offset: "1000",
      });
      ingestEtherscanLogs(pairs, payload, "erc20");
    }
  };
  await Promise.all(Array.from({ length: concurrency }, () => run()));

  const nftPayload = await etherscanJson({
    module: "account",
    action: "tokennfttx",
    address: owner,
    page: "1",
    offset: "400",
    sort: "desc",
  });
  const nftResult =
    nftPayload && typeof nftPayload === "object"
      ? (nftPayload as { result?: unknown }).result
      : null;
  const nftSeen = new Set<string>();
  if (Array.isArray(nftResult)) {
    const nftContracts: string[] = [];
    for (const row of nftResult as Array<{ contractAddress?: string }>) {
      const c = row.contractAddress;
      if (!c) {
        continue;
      }
      const lower = c.toLowerCase();
      if (nftSeen.has(lower)) {
        continue;
      }
      nftSeen.add(lower);
      nftContracts.push(c);
      if (nftContracts.length >= 24) {
        break;
      }
    }
    for (const token of nftContracts) {
      const payload = await etherscanJson({
        module: "logs",
        action: "getLogs",
        address: token,
        fromBlock: "0",
        toBlock: "latest",
        topic0: APPROVAL_FOR_ALL_TOPIC,
        topic1: ownerTopic,
        topic0_1_opr: "and",
        page: "1",
        offset: "200",
      });
      ingestEtherscanLogs(pairs, payload, "erc721-for-all");
    }
  }

  return { pairs, used: true };
}

type Rechecked = {
  pair: Pair;
  allowance: bigint;
  balance: bigint;
  symbol: string;
  name: string;
  decimals: number;
};

async function recheckPairs(
  client: MainnetClient,
  owner: Address,
  pairs: Pair[],
): Promise<Rechecked[]> {
  const erc20 = pairs.filter((p) => p.kind === "erc20");
  const nfts = pairs.filter((p) => p.kind === "erc721-for-all");
  const live: Rechecked[] = [];

  const allowanceCalls = erc20.map((p) => ({
    address: p.token,
    abi: erc20Abi,
    functionName: "allowance" as const,
    args: [owner, p.spender] as const,
  }));
  const balanceCalls = erc20.map((p) => ({
    address: p.token,
    abi: erc20Abi,
    functionName: "balanceOf" as const,
    args: [owner] as const,
  }));
  const symbolCalls = erc20.map((p) => ({
    address: p.token,
    abi: erc20Abi,
    functionName: "symbol" as const,
  }));
  const nameCalls = erc20.map((p) => ({
    address: p.token,
    abi: erc20Abi,
    functionName: "name" as const,
  }));
  const decimalCalls = erc20.map((p) => ({
    address: p.token,
    abi: erc20Abi,
    functionName: "decimals" as const,
  }));

  const [allowances, balances, symbols, names, decimals] = await Promise.all([
    multicallChunk<bigint>(client, allowanceCalls),
    multicallChunk<bigint>(client, balanceCalls),
    multicallChunk<string>(client, symbolCalls),
    multicallChunk<string>(client, nameCalls),
    multicallChunk<number>(client, decimalCalls),
  ]);

  erc20.forEach((pair, i) => {
    const allowance = okResult(allowances[i]);
    if (allowance == null || allowance <= 0n) {
      return;
    }
    const known = knownToken(pair.token);
    const balance = okResult(balances[i]) ?? 0n;
    const symbolRaw = okResult(symbols[i]);
    const nameRaw = okResult(names[i]);
    const symbol = symbolRaw
      ? String(symbolRaw).slice(0, 12)
      : (known?.symbol ?? pair.token.slice(0, 6));
    const name = nameRaw
      ? String(nameRaw).slice(0, 48)
      : (known?.name ?? symbol);
    const decRaw = okResult(decimals[i]) ?? known?.decimals;
    const dec =
      typeof decRaw === "number"
        ? decRaw
        : typeof decRaw === "bigint"
          ? Number(decRaw)
          : 18;
    live.push({
      pair,
      allowance,
      balance,
      symbol,
      name,
      decimals: Number.isFinite(dec) ? dec : 18,
    });
  });

  const approvedCalls = nfts.map((p) => ({
    address: p.token,
    abi: erc721Abi,
    functionName: "isApprovedForAll" as const,
    args: [owner, p.spender] as const,
  }));
  const nftBalanceCalls = nfts.map((p) => ({
    address: p.token,
    abi: erc721Abi,
    functionName: "balanceOf" as const,
    args: [owner] as const,
  }));
  const nftSymbolCalls = nfts.map((p) => ({
    address: p.token,
    abi: erc721Abi,
    functionName: "symbol" as const,
  }));
  const nftNameCalls = nfts.map((p) => ({
    address: p.token,
    abi: erc721Abi,
    functionName: "name" as const,
  }));

  const [approved, nftBalances, nftSymbols, nftNames] = await Promise.all([
    multicallChunk<boolean>(client, approvedCalls),
    multicallChunk<bigint>(client, nftBalanceCalls),
    multicallChunk<string>(client, nftSymbolCalls),
    multicallChunk<string>(client, nftNameCalls),
  ]);

  nfts.forEach((pair, i) => {
    if (okResult(approved[i]) !== true) {
      return;
    }
    const meta = knownNft(pair.token);
    const balance = okResult(nftBalances[i]) ?? 0n;
    const symbolRaw = okResult(nftSymbols[i]);
    const nameRaw = okResult(nftNames[i]);
    const symbol = symbolRaw
      ? String(symbolRaw).slice(0, 16)
      : (meta?.symbol ?? pair.token.slice(0, 6));
    const name = nameRaw
      ? String(nameRaw).slice(0, 48)
      : (meta?.name ?? symbol);
    live.push({
      pair,
      allowance: 1n,
      balance,
      symbol,
      name,
      decimals: 0,
    });
  });

  return live;
}

export async function scanWallet(rawQuery: string): Promise<ScanResult> {
  const cached = getCachedScan(rawQuery);
  if (cached) {
    return cached;
  }

  const client = getMainnetClient();
  const resolved = await resolveWallet(client, rawQuery);
  const cachedAddr = getCachedScan(resolved.address);
  if (cachedAddr) {
    return cachedAddr;
  }

  const latest = await client.getBlockNumber();
  const warnings: string[] = [];
  const sources: ScanSources = { logs: false, etherscan: false, probe: false };

  const merged = new Map<string, Pair>();

  const [probe, logs, etherscan] = await Promise.all([
    probeKnownPairs(client, resolved.address).catch((err: unknown) => {
      warnings.push(
        `Known-pair probe failed: ${err instanceof Error ? err.message : "rpc"}`,
      );
      return new Map<string, Pair>();
    }),
    discoverLogsRpc(client, resolved.address, latest).catch((err: unknown) => {
      warnings.push(
        `Log scan failed: ${err instanceof Error ? err.message : "rpc"}`,
      );
      return {
        pairs: new Map<string, Pair>(),
        fromBlock: null,
        reachedGenesis: false,
        calls: 0,
      } satisfies LogScan;
    }),
    discoverEtherscan(resolved.address).catch(() => ({
      pairs: new Map<string, Pair>(),
      used: Boolean(process.env.ETHERSCAN_API_KEY?.trim()),
    })),
  ]);

  if (probe.size > 0) {
    sources.probe = true;
    for (const p of probe.values()) {
      addPair(merged, p);
    }
  }
  if (logs.pairs.size > 0) {
    sources.logs = true;
    for (const p of logs.pairs.values()) {
      addPair(merged, p);
    }
  }
  if (etherscan.used) {
    sources.etherscan = true;
    for (const p of etherscan.pairs.values()) {
      addPair(merged, p);
    }
  }

  const rechecked = await recheckPairs(
    client,
    resolved.address,
    [...merged.values()],
  );

  const uniqueTokens = [
    ...new Set(
      rechecked
        .filter((r) => r.pair.kind === "erc20" && r.balance > 0n)
        .map((r) => r.pair.token),
    ),
  ];
  const prices = await fetchUsdPrices(uniqueTokens);

  const approvals: OpenApproval[] = rechecked.map((row) => {
    const unlimited =
      row.pair.kind === "erc721-for-all" ? true : isUnlimitedAllowance(row.allowance);
    const movable =
      row.pair.kind === "erc721-for-all"
        ? row.balance
        : movableAmount(row.allowance, row.balance);
    const usdPrice = prices.get(row.pair.token.toLowerCase()) ?? null;
    const usdMovable =
      row.pair.kind === "erc20" && usdPrice != null
        ? usdFromAtomic(movable, row.decimals, usdPrice)
        : null;
    return {
      id: approvalId(row.pair.token, row.pair.spender, row.pair.kind),
      kind: row.pair.kind,
      token: row.pair.token,
      tokenSymbol: row.symbol,
      tokenName: row.name,
      decimals: row.decimals,
      spender: row.pair.spender,
      spenderLabel: labelSpender(row.pair.spender),
      allowance: row.allowance,
      balance: row.balance,
      movable,
      unlimited,
      usdMovable,
      usdPrice,
    };
  });

  const ranked = rankApprovals(approvals);
  const partial = !logs.reachedGenesis;
  const result: ScanResult = {
    query: rawQuery.trim(),
    address: resolved.address,
    ens: resolved.ens,
    chainId: 1,
    scannedAt: Date.now(),
    partial,
    earliestBlock: logs.fromBlock != null ? logs.fromBlock.toString() : null,
    latestBlock: latest.toString(),
    fromBlock: logs.fromBlock != null ? logs.fromBlock.toString() : null,
    approvals: ranked,
    headline: buildHeadline(ranked),
    sources,
    warnings,
  };

  setCachedScan(rawQuery, result);
  return result;
}
