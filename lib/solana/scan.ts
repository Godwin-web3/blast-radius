import { getCachedScan, setCachedScan } from "../cache";
import { rpcUrlsFor, type SolanaChain } from "../chains";
import { buildHeadline } from "../headline";
import { fetchUsdPrices, usdFromAtomic } from "../prices";
import { approvalId, rankApprovals } from "../ranking";
import { ResolveError } from "../resolve";
import type { OpenApproval, ScanResult, ScanSources } from "../types";
import { isSolanaAddress } from "./address";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "./constants";
import { knownSplToken, labelDelegate } from "./known";
import {
  collectDelegateExposures,
  displayMintSymbol,
  extractTokenAccount,
  movableDelegateAmount,
  parseMintMetadata,
  type DelegateExposure,
  type MintMeta,
  type TokenAccountRecord,
} from "./parse";
import { getMultipleAccountsParsed, getSlot, getTokenAccountsByOwner } from "./rpc";

const JUPITER_TOKEN_URL = "https://lite-api.jup.ag/tokens/v2/search";

export function resolveSolanaWallet(raw: string): string {
  const query = raw.trim();
  if (!query) {
    throw new ResolveError("invalid", "Paste a Solana base58 address.");
  }
  if (query.endsWith(".eth")) {
    throw new ResolveError("invalid", "Solana uses base58 addresses, not ENS.");
  }
  if (query.startsWith("0x") || query.startsWith("0X")) {
    throw new ResolveError("invalid", "That looks like an EVM address. Pick Solana and paste a base58 wallet.");
  }
  if (!isSolanaAddress(query)) {
    throw new ResolveError("invalid", "Use a Solana base58 address (32–44 characters).");
  }
  return query;
}

type ProgramFetch = {
  ok: boolean;
  rows: unknown[];
  slot: number | null;
  error?: string;
};

async function fetchProgramAccounts(
  urls: readonly string[],
  owner: string,
  programId: string,
): Promise<ProgramFetch> {
  try {
    const result = await getTokenAccountsByOwner(urls, owner, programId);
    return { ok: true, rows: result.value, slot: result.slot };
  } catch (err) {
    return {
      ok: false,
      rows: [],
      slot: null,
      error: err instanceof Error ? err.message : "rpc",
    };
  }
}

async function loadMintMeta(
  urls: readonly string[],
  mints: readonly string[],
): Promise<Map<string, MintMeta>> {
  const map = new Map<string, MintMeta>();
  if (mints.length === 0) {
    return map;
  }
  try {
    const accounts = await getMultipleAccountsParsed(urls, mints);
    for (const row of accounts) {
      if (!row.account) {
        continue;
      }
      const meta = parseMintMetadata({ mint: row.pubkey, account: row.account });
      map.set(row.pubkey, { ...meta, mint: row.pubkey });
    }
  } catch {
    // Metadata is optional. Delegates still render with truncated mints.
  }
  return map;
}

async function fetchTokenListSymbols(
  mints: readonly string[],
): Promise<Map<string, { symbol: string; name: string }>> {
  const map = new Map<string, { symbol: string; name: string }>();
  const queue = mints.slice(0, 8);
  if (queue.length === 0) {
    return map;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    await Promise.all(
      queue.map(async (mint) => {
        try {
          const url = `${JUPITER_TOKEN_URL}?query=${encodeURIComponent(mint)}`;
          const res = await fetch(url, {
            signal: controller.signal,
            headers: {
              accept: "application/json",
              "user-agent": "blast-radius/1.0 (read-only mint metadata)",
            },
            cache: "no-store",
          });
          if (!res.ok) {
            return;
          }
          const json: unknown = await res.json();
          const rows = Array.isArray(json) ? json : [];
          const match = rows.find((row) => {
            if (!row || typeof row !== "object") {
              return false;
            }
            const id = (row as { id?: unknown }).id;
            return id === mint;
          }) as { symbol?: unknown; name?: unknown } | undefined;
          const symbol = typeof match?.symbol === "string" ? match.symbol.trim() : "";
          const name = typeof match?.name === "string" ? match.name.trim() : "";
          if (symbol) {
            map.set(mint, { symbol: symbol.slice(0, 16), name: (name || symbol).slice(0, 48) });
          }
        } catch {
          // Token list is optional.
        }
      }),
    );
  } finally {
    clearTimeout(timer);
  }
  return map;
}

function resolveSymbolName(
  mint: string,
  onchain: MintMeta | undefined,
  listed: { symbol: string; name: string } | undefined,
): { symbol: string; name: string; decimals: number | null } {
  const known = knownSplToken(mint);
  const symbol =
    onchain?.symbol ??
    listed?.symbol ??
    known?.symbol ??
    null;
  const name =
    onchain?.name ??
    listed?.name ??
    known?.name ??
    symbol;
  return {
    symbol: displayMintSymbol(mint, symbol),
    name: name ?? displayMintSymbol(mint, symbol),
    decimals: onchain?.decimals ?? known?.decimals ?? null,
  };
}

function permanentRows(
  owner: string,
  accounts: readonly TokenAccountRecord[],
  mintMeta: Map<string, MintMeta>,
): OpenApproval[] {
  const byMint = new Map<
    string,
    { balance: bigint; decimals: number; accounts: number }
  >();
  for (const account of accounts) {
    if (!account) {
      continue;
    }
    const current = byMint.get(account.mint) ?? {
      balance: 0n,
      decimals: account.decimals,
      accounts: 0,
    };
    current.balance += account.amount;
    current.decimals = account.decimals;
    current.accounts += 1;
    byMint.set(account.mint, current);
  }

  const rows: OpenApproval[] = [];
  for (const [mint, meta] of mintMeta) {
    const delegate = meta.permanentDelegate;
    if (!delegate || delegate === owner) {
      continue;
    }
    const bag = byMint.get(mint);
    if (!bag || bag.balance < 0n) {
      continue;
    }
    // Only surface when the wallet actually holds the mint — otherwise it is not this wallet's exposure.
    if (bag.accounts === 0) {
      continue;
    }
    rows.push({
      id: approvalId(mint, delegate, "spl-permanent-delegate"),
      kind: "spl-permanent-delegate",
      token: mint,
      tokenSymbol: "",
      tokenName: "",
      decimals: bag.decimals,
      spender: delegate,
      spenderLabel: `${labelDelegate(delegate)} · permanent`,
      allowance: bag.balance,
      balance: bag.balance,
      movable: bag.balance,
      unlimited: true,
      usdMovable: null,
      usdPrice: null,
      tokenAccount: mint,
    });
  }
  return rows;
}

function delegateToApproval(row: DelegateExposure, symbol: string, name: string, decimals: number): OpenApproval {
  const movable = movableDelegateAmount(row.delegatedAmount, row.balance, row.frozen);
  const label = row.frozen ? `${labelDelegate(row.delegate)} · frozen` : labelDelegate(row.delegate);
  return {
    id: approvalId(row.tokenAccount, row.delegate, "spl-delegate"),
    kind: "spl-delegate",
    token: row.mint,
    tokenSymbol: symbol,
    tokenName: name,
    decimals,
    spender: row.delegate,
    spenderLabel: label,
    allowance: row.delegatedAmount,
    balance: row.balance,
    movable,
    unlimited: row.unlimited,
    usdMovable: null,
    usdPrice: null,
    frozen: row.frozen,
    tokenAccount: row.tokenAccount,
  };
}

export async function scanSolanaWallet(
  rawQuery: string,
  chain: SolanaChain,
): Promise<ScanResult> {
  const cached = getCachedScan(chain.slug, rawQuery);
  if (cached) {
    return cached;
  }

  const owner = resolveSolanaWallet(rawQuery);
  const cachedAddr = getCachedScan(chain.slug, owner);
  if (cachedAddr) {
    return cachedAddr;
  }

  const urls = rpcUrlsFor(chain);
  const warnings: string[] = [];
  const sources: ScanSources = {
    logs: false,
    etherscan: false,
    probe: false,
    tokenAccounts: false,
  };

  const [legacy, token2022, slot] = await Promise.all([
    fetchProgramAccounts(urls, owner, TOKEN_PROGRAM_ID),
    fetchProgramAccounts(urls, owner, TOKEN_2022_PROGRAM_ID),
    getSlot(urls),
  ]);

  if (!legacy.ok) {
    warnings.push(`SPL Token accounts: ${legacy.error ?? "rpc failed"}`);
  }
  if (!token2022.ok) {
    warnings.push(`Token-2022 accounts: ${token2022.error ?? "rpc failed"}`);
  }
  if (!legacy.ok && !token2022.ok) {
    throw new Error(
      "Solana RPC could not read token accounts. Set SOLANA_RPC (or HELIUS_API_KEY) and retry.",
    );
  }

  const allRows = [...legacy.rows, ...token2022.rows];
  sources.tokenAccounts = allRows.length > 0 || (legacy.ok && token2022.ok);

  const extracted = allRows
    .map((row) => extractTokenAccount(row))
    .filter((row): row is NonNullable<typeof row> => row != null);
  const exposures = collectDelegateExposures(allRows);
  const mints = [...new Set(extracted.map((row) => row.mint))];
  const mintMeta = await loadMintMeta(urls, mints);

  const unknownMints = mints.filter((mint) => {
    if (knownSplToken(mint)) {
      return false;
    }
    const meta = mintMeta.get(mint);
    return !meta?.symbol;
  });
  const listed = await fetchTokenListSymbols(unknownMints);

  const approvals: OpenApproval[] = [];

  for (const row of exposures) {
    const resolved = resolveSymbolName(row.mint, mintMeta.get(row.mint), listed.get(row.mint));
    const decimals = resolved.decimals ?? row.decimals;
    approvals.push(delegateToApproval(row, resolved.symbol, resolved.name, decimals));
  }

  for (const row of permanentRows(owner, extracted, mintMeta)) {
    const resolved = resolveSymbolName(row.token, mintMeta.get(row.token), listed.get(row.token));
    approvals.push({
      ...row,
      tokenSymbol: resolved.symbol,
      tokenName: resolved.name,
      decimals: resolved.decimals ?? row.decimals,
    });
  }

  const uniqueMints = [
    ...new Set(approvals.filter((a) => a.movable > 0n).map((a) => a.token)),
  ];
  const prices = await fetchUsdPrices(uniqueMints, chain);

  const priced: OpenApproval[] = approvals.map((row) => {
    const usdPrice = prices.get(row.token) ?? prices.get(row.token.toLowerCase()) ?? null;
    const usdMovable =
      usdPrice != null ? usdFromAtomic(row.movable, row.decimals, usdPrice) : null;
    return { ...row, usdPrice, usdMovable };
  });

  const ranked = rankApprovals(priced);
  const latest = slot ?? legacy.slot ?? token2022.slot;
  const partial = !legacy.ok || !token2022.ok;
  const result: ScanResult = {
    query: rawQuery.trim(),
    address: owner,
    ens: null,
    chainId: chain.chainId,
    chain: chain.slug,
    chainName: chain.name,
    family: "solana",
    scannedAt: Date.now(),
    partial,
    earliestBlock: null,
    latestBlock: latest != null ? String(latest) : "unknown",
    fromBlock: null,
    approvals: ranked,
    headline: buildHeadline(ranked, { noun: "delegate" }),
    sources,
    warnings,
  };

  setCachedScan(chain.slug, rawQuery, result);
  return result;
}
