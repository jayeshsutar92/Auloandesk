export interface GoldRateInfo {
  rate24kPerGram: number;
  currency: string;
  unit: string;
  asOf: string;
  ttlSeconds: number;
  expiresAt: string;
  fromCache: boolean;
  source: string;
  notes: string;
}

export const BASE_24K_GOLD_RATE = 7000;
export const DEFAULT_GOLD_RATE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedRate {
  rate: number;
  cachedAt: number;
  expiresAt: number;
}

let memoryCache: CachedRate | null = null;

/**
 * Returns the authoritative 24K gold benchmark rate per gram.
 * Single source of truth for all quote and loan calculations.
 */
export function getCurrentRate24k(): number {
  return BASE_24K_GOLD_RATE;
}

/**
 * Retrieves the cached 24K gold rate with caching metadata.
 * If the cache is expired or empty, refreshes the cache timestamp.
 */
export function getGoldRateInfo(ttlMs: number = DEFAULT_GOLD_RATE_TTL_MS): GoldRateInfo {
  const now = Date.now();

  let fromCache = true;

  if (!memoryCache || now >= memoryCache.expiresAt) {
    fromCache = false;
    memoryCache = {
      rate: BASE_24K_GOLD_RATE,
      cachedAt: now,
      expiresAt: now + ttlMs
    };
  }

  return {
    rate24kPerGram: memoryCache.rate,
    currency: "INR",
    unit: "gram",
    asOf: new Date(memoryCache.cachedAt).toISOString(),
    ttlSeconds: Math.round(ttlMs / 1000),
    expiresAt: new Date(memoryCache.expiresAt).toISOString(),
    fromCache,
    source: "MOCK_MARKET_BENCHMARK",
    notes:
      "Fixed benchmark rate of ₹7,000/g per assignment specification. Cached in-memory with automatic TTL refresh to support live bullion rate feeds."
  };
}

/**
 * Utility to clear the in-memory cache (primarily used in tests to assert fresh fetch).
 */
export function resetGoldRateCache(): void {
  memoryCache = null;
}
