import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { MOCK_BASE } from "@/lib/mockData";
import SYMBOLS_MAP from "@/lib/symbolsMap";

type DataSource = "real" | "simulated" | "mock";

type Quote = {
  symbol: string;
  price: number;
  high?: number;
  low?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  latestTradingDay?: string;
  market?: string;
  source?: DataSource;
};

type CacheWrapper = {
  ts: number;
  data: Quote[];
  anchorTs?: number;
};

const CACHE_TTL_SEC = 300;
const CACHE_TTL_MS = CACHE_TTL_SEC * 1000;
const REAL_WINDOW_MS = 15_000;

let redis: Redis | null = null;

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const memoryCache = new Map<string, CacheWrapper>();
const inflight = new Map<string, Promise<Quote[]>>();

function isFresh(wrapper: CacheWrapper, isRealData = false) {
  const threshold = isRealData ? CACHE_TTL_MS : REAL_WINDOW_MS;
  return Date.now() - wrapper.ts < threshold;
}

function isValidCacheWrapper(value: unknown): value is CacheWrapper {
  if (!value || typeof value !== "object") return false;

  const candidate = value as CacheWrapper;
  if (!Number.isFinite(candidate.ts)) return false;
  if (!Array.isArray(candidate.data)) return false;

  return candidate.data.every((q) => {
    if (!q || typeof q !== "object") return false;
    const quote = q as Quote;
    return typeof quote.symbol === "string" && Number.isFinite(quote.price);
  });
}

async function getCache(key: string): Promise<CacheWrapper | null> {
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (!raw) {
        return null;
      }

      const parsed =
        typeof raw === "string"
          ? (JSON.parse(raw) as unknown)
          : (raw as unknown);

      if (!isValidCacheWrapper(parsed)) {
        await redis.del(key).catch(() => {});
        return null;
      }

      return parsed;
    } catch (e) {
      console.warn("[/api/markets] Redis get error, using memory cache:", e);
    }
  }

  const local = memoryCache.get(key);
  if (!local) return null;

  if (!isValidCacheWrapper(local)) {
    memoryCache.delete(key);
    return null;
  }

  if (Date.now() - local.ts > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }

  return local;
}

async function setCache(key: string, data: Quote[], isReal = false) {
  const prev = await getCache(key);

  const wrapper: CacheWrapper = {
    ts: Date.now(),
    data,
    anchorTs: isReal ? Date.now() : prev?.anchorTs,
  };

  memoryCache.set(key, wrapper);

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(wrapper), {
        ex: CACHE_TTL_SEC,
      });
    } catch (e) {
      console.warn("[/api/markets] Redis set error, using memory cache:", e);
    }
  }
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function maxAbsDelta(price: number) {
  if (price >= 50_000) return price * 0.0002;
  if (price >= 10_000) return price * 0.0004;
  if (price >= 1_000) return price * 0.0008;
  if (price >= 100) return price * 0.0015;
  return price * 0.003;
}

function simulate(wrapper: CacheWrapper): Quote[] {
  const now = Date.now();
  const bucket = Math.floor(now / 10_000);
  const elapsedMin = (now - wrapper.ts) / 60_000;
  const maxPct = Math.min(elapsedMin * 0.25, 0.75) / 100;
  const smooth = Math.min(elapsedMin / 2, 1);

  return wrapper.data.map((q) => {
    const seed = hash(q.symbol + bucket);
    const rand = ((seed % 1000) / 1000) * 2 - 1;

    const pctDelta = q.price * rand * maxPct;
    const absCap = maxAbsDelta(q.price);
    const delta = Math.max(-absCap, Math.min(absCap, pctDelta)) * smooth;

    const price = q.price + delta;
    const prev = q.previousClose ?? q.price;

    return {
      ...q,
      price: Number(price.toFixed(6)),
      change: price - prev,
      changePercent: ((price - prev) / prev) * 100,
      source: "simulated",
    };
  });
}

function deriveMock(wrapper: CacheWrapper, market: string): Quote[] {
  const now = Date.now();
  const anchor = wrapper.anchorTs ?? wrapper.ts;
  const elapsedMin = (now - anchor) / 60_000;
  const maxPct = Math.min(elapsedMin * 0.1, 1) / 100;

  return wrapper.data.map((q) => {
    const seed = hash(q.symbol + Math.floor(now / 30_000));
    const rand = ((seed % 1000) / 1000) * 2 - 1;

    const delta = q.price * rand * maxPct * 0.5;
    const price = q.price + delta;
    const prev = q.previousClose ?? q.price;

    return {
      ...q,
      price: Number(price.toFixed(6)),
      change: price - prev,
      changePercent: ((price - prev) / prev) * 100,
      source: "mock",
      market,
    };
  });
}

function getBaseMock(market: string, symbols: string[]): Quote[] {
  return symbols.map((s) => {
    const base = MOCK_BASE[market]?.find((b) => b.symbol === s)?.price ?? 100;

    return {
      symbol: s,
      price: base,
      latestTradingDay: new Date().toISOString(),
      source: "mock",
      market,
    };
  });
}

async function fetchMarketDataReal(market: string): Promise<Quote[]> {
  const symbols = SYMBOLS_MAP[market] ?? [];

  if (!symbols.length) {
    throw new Error(`Invalid market: ${market}`);
  }

  try {
    console.log(`[/api/markets] Intentando obtener datos REALES para ${market}...`);

    const port = process.env.PORT || "3000";
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        : `http://localhost:${port}`;

    const url = `${baseUrl}/api/alpha-markets?market=${market}`;

    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      throw new Error(`Alpha markets returned ${res.status}`);
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Invalid or empty response from alpha-markets");
    }

    console.log(`[/api/markets] Datos REALES obtenidos para ${market}: ${data.length} simbolos`);
    return data.map((q) => ({ ...q, source: "real" as DataSource }));
  } catch (error) {
    console.warn(`[/api/markets] No se pudieron obtener datos REALES para ${market}:`, error);
    console.log(`[/api/markets] Usando MOCK como fallback para ${market}`);
    return getBaseMock(market, symbols);
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const marketParam = url.searchParams.get("market") ?? "crypto";
    const market = marketParam.toLowerCase();

    if (!(market in SYMBOLS_MAP)) {
      console.warn(`[/api/markets] Invalid market: ${market}`);
      return NextResponse.json(
        {
          error: "invalid_market",
          message: `Market must be one of: ${Object.keys(SYMBOLS_MAP).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const key = `market-${market}`;
    const cached = await getCache(key);

    if (cached) {
      const hasRealData = cached.data[0]?.source === "real";
      const fresh = isFresh(cached, hasRealData);
      const shouldSimulate = !hasRealData && !fresh;
      const response = shouldSimulate ? simulate(cached) : cached.data;

      console.log(
        `[/api/markets] Retornando desde cache: ${market}, real=${hasRealData}, fresh=${fresh}, simulated=${shouldSimulate}`
      );

      return NextResponse.json(response, {
        status: 200,
        headers: {
          "X-Data-Source": hasRealData ? "cache-real" : "cache-simulated",
          "X-Cache-Age": String(Date.now() - cached.ts),
        },
      });
    }

    if (inflight.has(key)) {
      try {
        await inflight.get(key);
        const again = await getCache(key);
        if (again) {
          const hasRealData = again.data[0]?.source === "real";
          const fresh = isFresh(again, hasRealData);
          const shouldSimulate = !hasRealData && !fresh;

          return NextResponse.json(shouldSimulate ? simulate(again) : again.data, {
            status: 200,
            headers: {
              "X-Data-Source": hasRealData ? "inflight-real" : "inflight-simulated",
            },
          });
        }
      } catch {
        // Si falla el inflight, continuar con el fallback normal.
      }
    }

    const p = (async () => {
      const data = await fetchMarketDataReal(market);
      const isReal = data[0]?.source === "real";
      await setCache(key, data, isReal);
      return data;
    })();

    inflight.set(key, p);

    try {
      const data = await p;
      const isReal = data[0]?.source === "real";

      console.log(`[/api/markets] Retornando datos ${isReal ? "REALES" : "MOCK"} para ${market}`);

      return NextResponse.json(data, {
        status: 200,
        headers: {
          "X-Data-Source": isReal ? "real" : "mock",
          "Cache-Control": "public, s-maxage=300",
        },
      });
    } catch (error) {
      console.warn(`[/api/markets] Fetch failed for ${market}:`, error);

      let fallback: Quote[];
      const fallbackCache = await getCache(key);

      if (fallbackCache) {
        const hasRealData = fallbackCache.data[0]?.source === "real";
        fallback = hasRealData
          ? fallbackCache.data
          : fallbackCache.anchorTs
            ? deriveMock(fallbackCache, market)
            : simulate(fallbackCache);
      } else {
        fallback = getBaseMock(market, SYMBOLS_MAP[market] ?? []);
      }

      await setCache(key, fallback, false);

      console.log(`[/api/markets] Retornando FALLBACK para ${market}`);

      return NextResponse.json(fallback, {
        status: 200,
        headers: {
          "X-Data-Source": "fallback-mock",
        },
      });
    } finally {
      inflight.delete(key);
    }
  } catch (error) {
    console.error("[/api/markets] Fatal error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to load market data" },
      { status: 500 }
    );
  }
}
