import type { SupportedChain } from "./chains";

export type PriceMap = Map<string, number>;

/**
 * Live USD prices from CoinGecko's public API (1 contract per request).
 * Missing tokens stay missing — callers must not invent a price.
 */
export async function fetchUsdPrices(
  tokenAddresses: readonly string[],
  chain: SupportedChain,
  timeoutMs = 7000,
): Promise<PriceMap> {
  const unique = [
    ...new Set(
      chain.family === "solana"
        ? tokenAddresses.map((a) => a.trim()).filter((a) => a.length >= 32)
        : tokenAddresses.map((a) => a.toLowerCase()).filter((a) => a.startsWith("0x")),
    ),
  ].slice(0, 12);
  const map: PriceMap = new Map();
  if (unique.length === 0) {
    return map;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOne = async (address: string): Promise<void> => {
    if (controller.signal.aborted) {
      return;
    }
    try {
      const url = `https://api.coingecko.com/api/v3/simple/token_price/${chain.coingeckoPlatform}?contract_addresses=${address}&vs_currencies=usd`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: "application/json",
          "user-agent": "blast-radius/1.0 (read-only token prices)",
        },
        cache: "no-store",
      });
      if (!res.ok) {
        return;
      }
      const json: unknown = await res.json();
      if (!json || typeof json !== "object") {
        return;
      }
      const entry = (json as Record<string, unknown>)[address];
      if (!entry || typeof entry !== "object") {
        return;
      }
      const usd = (entry as { usd?: unknown }).usd;
      if (typeof usd === "number" && Number.isFinite(usd) && usd > 0) {
        map.set(address, usd);
      }
    } catch {
      // Honest fallback: skip this token.
    }
  };

  try {
    const concurrency = 2;
    let cursor = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (cursor < unique.length && !controller.signal.aborted) {
        const i = cursor;
        cursor += 1;
        const address = unique[i];
        if (address) {
          await fetchOne(address);
        }
      }
    });
    await Promise.all(workers);
  } finally {
    clearTimeout(timer);
  }
  return map;
}

export function usdFromAtomic(
  amount: bigint,
  decimals: number,
  usdPrice: number,
): number | null {
  if (amount <= 0n || !Number.isFinite(usdPrice) || usdPrice <= 0) {
    return null;
  }
  const d = Math.max(0, Math.min(36, decimals));
  const asNumber = Number(amount) / 10 ** d;
  if (!Number.isFinite(asNumber)) {
    return null;
  }
  const usd = asNumber * usdPrice;
  if (!Number.isFinite(usd) || usd < 0) {
    return null;
  }
  return Math.round(usd * 100) / 100;
}
