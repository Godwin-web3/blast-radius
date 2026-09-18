import { MAX_U64, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "./constants";
import { isSolanaAddress, truncatePubkey } from "./address";

export type SplProgram = "spl-token" | "spl-token-2022";

export type TokenAccountRecord = {
  pubkey: string;
  programId: string;
  mint: string;
  owner: string;
  state: string | null;
  amount: bigint;
  decimals: number;
  delegate: string | null;
  delegatedAmount: bigint;
};

export type DelegateExposure = {
  tokenAccount: string;
  mint: string;
  owner: string;
  delegate: string;
  delegatedAmount: bigint;
  balance: bigint;
  decimals: number;
  frozen: boolean;
  program: SplProgram;
  unlimited: boolean;
};

export type MintMeta = {
  mint: string;
  decimals: number | null;
  symbol: string | null;
  name: string | null;
  permanentDelegate: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Parse a jsonParsed token amount (`{ amount }` / string / number) into bigint. */
export function parseTokenAmount(raw: unknown): bigint {
  if (raw == null) {
    return 0n;
  }
  if (typeof raw === "bigint") {
    return raw < 0n ? 0n : raw;
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) {
      return 0n;
    }
    return BigInt(Math.trunc(raw));
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!/^[0-9]+$/.test(trimmed)) {
      return 0n;
    }
    try {
      return BigInt(trimmed);
    } catch {
      return 0n;
    }
  }
  const rec = asRecord(raw);
  if (!rec) {
    return 0n;
  }
  if ("amount" in rec) {
    return parseTokenAmount(rec.amount);
  }
  return 0n;
}

export function parseDecimals(raw: unknown, fallback = 0): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(18, Math.trunc(raw)));
  }
  if (typeof raw === "bigint") {
    return Math.max(0, Math.min(18, Number(raw)));
  }
  if (typeof raw === "string" && /^[0-9]+$/.test(raw.trim())) {
    return Math.max(0, Math.min(18, Number(raw.trim())));
  }
  const rec = asRecord(raw);
  if (rec && "decimals" in rec) {
    return parseDecimals(rec.decimals, fallback);
  }
  return fallback;
}

export function isUnlimitedDelegatedAmount(amount: bigint): boolean {
  return amount >= MAX_U64;
}

/**
 * How many tokens the delegate can move *right now*.
 * Frozen classic/token-2022 accounts cannot transfer (permanent delegate is handled elsewhere).
 */
export function movableDelegateAmount(
  delegatedAmount: bigint,
  balance: bigint,
  frozen = false,
): bigint {
  if (frozen || balance <= 0n) {
    return 0n;
  }
  if (isUnlimitedDelegatedAmount(delegatedAmount)) {
    return balance;
  }
  return delegatedAmount < balance ? delegatedAmount : balance;
}

export function programFromId(programId: string): SplProgram {
  return programId === TOKEN_2022_PROGRAM_ID ? "spl-token-2022" : "spl-token";
}

function parsedInfoFromAccount(account: unknown): Record<string, unknown> | null {
  const rec = asRecord(account);
  if (!rec) {
    return null;
  }
  const data = rec.data;
  const dataRec = asRecord(data);
  if (dataRec) {
    const parsed = asRecord(dataRec.parsed);
    const info = parsed ? asRecord(parsed.info) : null;
    if (info) {
      return info;
    }
  }
  return asRecord(rec.info) ?? asRecord(rec.parsed);
}

/**
 * Pull a token account out of `getTokenAccountsByOwner` jsonParsed `value[]` rows
 * (or a flattened test fixture).
 */
export function extractTokenAccount(row: unknown): TokenAccountRecord | null {
  const rec = asRecord(row);
  if (!rec) {
    return null;
  }
  const pubkey = asString(rec.pubkey) ?? asString(rec.tokenAccount);
  const account = rec.account ?? rec;
  const accountRec = asRecord(account);
  const programId =
    asString(accountRec?.owner) ??
    asString(rec.programId) ??
    TOKEN_PROGRAM_ID;
  const info = parsedInfoFromAccount(account) ?? asRecord(rec.info);
  if (!pubkey || !isSolanaAddress(pubkey) || !info) {
    return null;
  }
  const mint = asString(info.mint);
  const owner = asString(info.owner);
  if (!mint || !owner || !isSolanaAddress(mint) || !isSolanaAddress(owner)) {
    return null;
  }
  const tokenAmount = info.tokenAmount;
  const amount = parseTokenAmount(tokenAmount ?? info.amount);
  const decimals = parseDecimals(tokenAmount, parseDecimals(info.decimals, 0));
  const delegateRaw = info.delegate;
  const delegate =
    typeof delegateRaw === "string" && isSolanaAddress(delegateRaw) ? delegateRaw : null;
  const delegatedAmount = parseTokenAmount(info.delegatedAmount);
  const state = asString(info.state);
  return {
    pubkey,
    programId,
    mint,
    owner,
    state,
    amount,
    decimals,
    delegate,
    delegatedAmount,
  };
}

/**
 * Active per-account delegate: non-null delegate and delegatedAmount > 0.
 * Does not invent risk for mint/freeze authorities.
 */
export function toDelegateExposure(account: TokenAccountRecord): DelegateExposure | null {
  if (!account.delegate || account.delegatedAmount <= 0n) {
    return null;
  }
  if (account.delegate === account.owner) {
    return null;
  }
  const frozen = (account.state ?? "").toLowerCase() === "frozen";
  return {
    tokenAccount: account.pubkey,
    mint: account.mint,
    owner: account.owner,
    delegate: account.delegate,
    delegatedAmount: account.delegatedAmount,
    balance: account.amount,
    decimals: account.decimals,
    frozen,
    program: programFromId(account.programId),
    unlimited: isUnlimitedDelegatedAmount(account.delegatedAmount),
  };
}

export function collectDelegateExposures(rows: readonly unknown[]): DelegateExposure[] {
  const out: DelegateExposure[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const account = extractTokenAccount(row);
    if (!account) {
      continue;
    }
    const exposure = toDelegateExposure(account);
    if (!exposure) {
      continue;
    }
    const id = `${exposure.tokenAccount}:${exposure.delegate}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(exposure);
  }
  return out;
}

function extensionName(ext: Record<string, unknown>): string {
  return (asString(ext.extension) ?? asString(ext.ext) ?? "").toLowerCase();
}

function extensionState(ext: Record<string, unknown>): Record<string, unknown> | null {
  return asRecord(ext.state) ?? asRecord(ext);
}

/** Permanent delegate on a Token-2022 mint, if present and a real pubkey. */
function mintInfoFromParsed(mintParsed: unknown): Record<string, unknown> | null {
  const root = asRecord(mintParsed);
  if (!root) {
    return null;
  }
  const account = asRecord(root.account) ?? root;
  const parsed = asRecord(asRecord(account.data)?.parsed) ?? asRecord(root.parsed);
  return asRecord(parsed?.info) ?? asRecord(account.info) ?? asRecord(root.info) ?? account;
}

export function parsePermanentDelegate(mintParsed: unknown): string | null {
  const info = mintInfoFromParsed(mintParsed);
  if (!info) {
    return null;
  }
  const extensions = info.extensions;
  if (!Array.isArray(extensions)) {
    const direct = asString(info.permanentDelegate);
    return direct && isSolanaAddress(direct) ? direct : null;
  }
  for (const item of extensions) {
    const ext = asRecord(item);
    if (!ext) {
      continue;
    }
    if (extensionName(ext) !== "permanentdelegate") {
      continue;
    }
    const state = extensionState(ext);
    const delegate = asString(state?.delegate) ?? asString(ext.delegate);
    if (delegate && isSolanaAddress(delegate)) {
      return delegate;
    }
  }
  return null;
}

export function parseMintMetadata(mintParsed: unknown): MintMeta {
  const empty: MintMeta = {
    mint: "",
    decimals: null,
    symbol: null,
    name: null,
    permanentDelegate: parsePermanentDelegate(mintParsed),
  };
  const root = asRecord(mintParsed);
  if (!root) {
    return empty;
  }
  const info = mintInfoFromParsed(mintParsed) ?? root;
  const mint = asString(root.mint) ?? asString(root.pubkey) ?? asString(info.mint) ?? "";
  const decimals = "decimals" in info ? parseDecimals(info.decimals, -1) : -1;
  let symbol: string | null = null;
  let name: string | null = null;
  const extensions = info.extensions;
  if (Array.isArray(extensions)) {
    for (const item of extensions) {
      const ext = asRecord(item);
      if (!ext) {
        continue;
      }
      const kind = extensionName(ext);
      if (kind !== "tokenmetadata" && kind !== "metadata") {
        continue;
      }
      const state = extensionState(ext) ?? ext;
      symbol = asString(state.symbol) ?? symbol;
      name = asString(state.name) ?? name;
    }
  }
  return {
    mint,
    decimals: decimals >= 0 ? decimals : null,
    symbol: symbol ? symbol.slice(0, 16) : null,
    name: name ? name.slice(0, 48) : null,
    permanentDelegate: parsePermanentDelegate(mintParsed),
  };
}

export function displayMintSymbol(mint: string, knownSymbol?: string | null): string {
  const trimmed = knownSymbol?.trim();
  if (trimmed) {
    return trimmed.slice(0, 16);
  }
  return truncatePubkey(mint, 4);
}

export { truncatePubkey, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, MAX_U64 };
