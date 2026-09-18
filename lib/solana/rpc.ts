import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "./constants";

type JsonRpcError = { code?: number; message?: string };
type JsonRpcResponse<T> = {
  jsonrpc?: string;
  id?: number | string;
  result?: T;
  error?: JsonRpcError;
};

const RPC_TIMEOUT_MS = 12_000;

function asError(err: unknown, fallback: string): Error {
  return err instanceof Error ? err : new Error(fallback);
}

export async function solanaRpc<T>(
  urls: readonly string[],
  method: string,
  params: unknown[],
): Promise<T> {
  if (urls.length === 0) {
    throw new Error("No Solana RPC URLs configured");
  }
  let lastError: Error | null = null;
  for (const url of urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        lastError = new Error(`Solana RPC HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as JsonRpcResponse<T>;
      if (json.error) {
        lastError = new Error(json.error.message ?? "Solana RPC error");
        continue;
      }
      if (json.result === undefined) {
        lastError = new Error(`${method} returned no result`);
        continue;
      }
      return json.result;
    } catch (err) {
      lastError = asError(err, `${method} failed`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error(`${method} failed`);
}

export type TokenAccountsResult = {
  slot: number | null;
  value: unknown[];
};

export async function getTokenAccountsByOwner(
  urls: readonly string[],
  owner: string,
  programId: string,
): Promise<TokenAccountsResult> {
  const result = await solanaRpc<{
    context?: { slot?: number };
    value?: unknown[];
  }>(urls, "getTokenAccountsByOwner", [
    owner,
    { programId },
    { encoding: "jsonParsed", commitment: "confirmed" },
  ]);
  const value = Array.isArray(result.value) ? result.value : [];
  const slot =
    typeof result.context?.slot === "number" ? result.context.slot : null;
  return { slot, value };
}

export async function getMultipleAccountsParsed(
  urls: readonly string[],
  pubkeys: readonly string[],
): Promise<Array<{ pubkey: string; account: unknown }>> {
  const out: Array<{ pubkey: string; account: unknown }> = [];
  const chunkSize = 100;
  for (let i = 0; i < pubkeys.length; i += chunkSize) {
    const chunk = pubkeys.slice(i, i + chunkSize);
    if (chunk.length === 0) {
      continue;
    }
    const result = await solanaRpc<Array<unknown> | { value?: unknown[] }>(
      urls,
      "getMultipleAccounts",
      [chunk, { encoding: "jsonParsed", commitment: "confirmed" }],
    );
    const values = Array.isArray(result)
      ? result
      : Array.isArray(result.value)
        ? result.value
        : [];
    chunk.forEach((pubkey, index) => {
      out.push({ pubkey, account: values[index] ?? null });
    });
  }
  return out;
}

export async function getSlot(urls: readonly string[]): Promise<number | null> {
  try {
    const slot = await solanaRpc<number>(urls, "getSlot", [{ commitment: "confirmed" }]);
    return typeof slot === "number" ? slot : null;
  } catch {
    return null;
  }
}

export { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID };
