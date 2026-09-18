import type { ChainSlug } from "./chains";
import type { ScanResult } from "./types";

const TTL_MS = 45_000;
const store = new Map<string, { at: number; result: ScanResult }>();

export function cacheKey(chain: ChainSlug, query: string): string {
  return `${chain}:${query.trim().toLowerCase()}`;
}

export function getCachedScan(chain: ChainSlug, query: string): ScanResult | null {
  const hit = store.get(cacheKey(chain, query));
  if (!hit) {
    return null;
  }
  if (Date.now() - hit.at > TTL_MS) {
    store.delete(cacheKey(chain, query));
    return null;
  }
  return hit.result;
}

export function setCachedScan(chain: ChainSlug, query: string, result: ScanResult): void {
  const payload = { at: Date.now(), result };
  store.set(cacheKey(chain, query), payload);
  store.set(cacheKey(chain, result.address), payload);
  if (result.ens) {
    store.set(cacheKey(chain, result.ens), payload);
  }
}
