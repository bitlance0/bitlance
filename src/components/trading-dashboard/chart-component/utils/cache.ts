import type { CandleData } from "../types";

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 min
type CacheValue = { data: CandleData[]; timestamp: number };
const map = new Map<string, CacheValue>();

export function cacheKey(symbol: string | null | undefined, interval: string) {
  return `${symbol ?? ""}-${interval}`;
}

export function getCached(symbol: string | null | undefined, interval: string): CandleData[] | null {
  const key = cacheKey(symbol, interval);
  const item = map.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_DURATION_MS) return null;
  return item.data;
}

export function setCached(symbol: string | null | undefined, interval: string, data: CandleData[]) {
  const key = cacheKey(symbol, interval);
  map.set(key, { data, timestamp: Date.now() });
}
