import type { ScanResult } from "./types";

const TTL_MS = 45_000;
const store = new Map<string, { at: number; result: ScanResult }>();

export function cacheKey(query: string): string {
  return query.trim().toLowerCase();
}

export function getCachedScan(query: string): ScanResult | null {
  const hit = store.get(cacheKey(query));
  if (!hit) {
    return null;
  }
  if (Date.now() - hit.at > TTL_MS) {
    store.delete(cacheKey(query));
    return null;
  }
  return hit.result;
}

export function setCachedScan(query: string, result: ScanResult): void {
  store.set(cacheKey(query), { at: Date.now(), result });
  store.set(cacheKey(result.address), { at: Date.now(), result });
  if (result.ens) {
    store.set(cacheKey(result.ens), { at: Date.now(), result });
  }
}
