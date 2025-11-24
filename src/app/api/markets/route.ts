// src/app/api/markets/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { MOCK_BASE } from "@/lib/mockData";
import { MARKETS } from "@/config/markets";
import SYMBOLS_MAP from "@/lib/symbolsMap";

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
};

/* ---------------------- Config ---------------------- */
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const CACHE_TTL_SEC = 300; // 5 minutos
const CACHE_TTL_MS = CACHE_TTL_SEC * 1000;

/* ---------------------- Upstash Redis init + memory fallback ---------------------- */
let redis: Redis | null = null;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (e) {
    console.warn("Upstash init failed, falling back to memory cache", e);
    redis = null;
  }
}

const memoryCache = new Map<string, { ts: number; data: Quote[] }>();
const inflightRequests = new Map<string, Promise<Quote[]>>();

/* ---------------------- Cache wrapper helpers (meta: ts+data) ---------------------- */
type CacheWrapper = { ts: number; data: Quote[] };

async function getCacheWithMeta(key: string): Promise<CacheWrapper | null> {
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (
        !parsed ||
        typeof parsed.ts !== "number" ||
        !Array.isArray(parsed.data)
      )
        return null;
      return parsed as CacheWrapper;
    } catch (err) {
      console.warn("Redis get error (meta):", err);
    }
  }

  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.ts > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return { ts: cached.ts, data: cached.data };
}

async function setCacheWithMeta(
  key: string,
  data: Quote[],
  ttlSec = CACHE_TTL_SEC
): Promise<void> {
  const wrapper: CacheWrapper = { ts: Date.now(), data };
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(wrapper), { ex: ttlSec });
      return;
    } catch (err) {
      console.warn("Redis set error (meta):", err);
    }
  }
  memoryCache.set(key, { ts: wrapper.ts, data: wrapper.data });
}

/* ---------------------- Alpha Vantage fetchers ---------------------- */
async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchGlobalQuote(symbol: string) {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
    symbol
  )}&apikey=${API_KEY}`;
  const res = await fetch(url);
  const json = await safeJson(res);
  if (!res.ok || !json)
    return { error: true, status: res.status, json } as const;
  if (
    json["Note"] ||
    json["Error Message"] ||
    Object.keys(json).length === 0
  ) {
    // Alpha Vantage returns 'Note' when rate-limited or a message
    return { error: true, status: res.status, json } as const;
  }
  const q = json["Global Quote"];
  if (!q) return { error: true, status: res.status, json } as const;

  const price = parseFloat(q["05. price"] ?? "0");
  const prev = parseFloat(q["08. previous close"] ?? "0");
  const high = parseFloat(q["03. high"] ?? "0");
  const low = parseFloat(q["04. low"] ?? "0");
  const change = parseFloat(q["09. change"] ?? (price - prev).toString());
  const changePercent = parseFloat(
    (q["10. change percent"] ?? "0%").replace("%", "")
  );

  return {
    error: false,
    data: {
      symbol: q["01. symbol"] ?? symbol,
      price,
      high,
      low,
      previousClose: prev,
      change,
      changePercent,
      latestTradingDay:
        q["07. latest trading day"] ?? new Date().toISOString(),
    } as Quote,
  } as const;
}

async function fetchCryptoQuote(symbol: string, market = "USD") {
  const url = `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${encodeURIComponent(
    symbol
  )}&market=${market}&apikey=${API_KEY}`;
  const res = await fetch(url);
  const json = await safeJson(res);
  if (!res.ok || !json)
    return { error: true, status: res.status, json } as const;
  if (
    json["Note"] ||
    json["Error Message"] ||
    !json["Time Series (Digital Currency Daily)"]
  ) {
    return { error: true, status: res.status, json } as const;
  }
  const series = json["Time Series (Digital Currency Daily)"];
  const latestKey = Object.keys(series)[0];
  const latest = series[latestKey];
  const price = parseFloat(latest["4a. close (USD)"] ?? "0");
  const high = parseFloat(latest["2a. high (USD)"] ?? "0");
  const low = parseFloat(latest["3a. low (USD)"] ?? "0");

  return {
    error: false,
    data: {
      symbol,
      price,
      high,
      low,
      latestTradingDay: latestKey,
    } as Quote,
  } as const;
}

async function fetchFxQuote(pair: string) {
  const from = pair.slice(0, 3);
  const to = pair.slice(3);
  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${API_KEY}`;
  const res = await fetch(url);
  const json = await safeJson(res);
  if (!res.ok || !json)
    return { error: true, status: res.status, json } as const;
  if (
    !json["Realtime Currency Exchange Rate"] ||
    json["Note"] ||
    json["Error Message"]
  ) {
    return { error: true, status: res.status, json } as const;
  }
  const data = json["Realtime Currency Exchange Rate"];
  const price = parseFloat(data["5. Exchange Rate"] ?? "0");
  const timestamp = data["6. Last Refreshed"] ?? new Date().toISOString();
  return {
    error: false,
    data: {
      symbol: pair,
      price,
      latestTradingDay: timestamp,
    } as Quote,
  } as const;
}

/* ---------------------- Mock dynamic generator ---------------------- */
/**
 * Varia ligeramente los valores base para que parezcan vivos.
 * - pctRange: ±percent en cada llamada, e.g. 0.5 = ±0.5%
 */
function varyValue(price: number, pctRange = 0.5) {
  const factor = 1 + (Math.random() * 2 - 1) * (pctRange / 100);
  return Number((price * factor).toFixed(6));
}

/**
 * getDynamicMock: genera mock dinámico a partir de MOCK_BASE o de una lista de símbolos.
 */
function getDynamicMock(market: string, symbols?: string[]): Quote[] {
  const base = (MOCK_BASE as Record<string, Quote[]>)[market] ?? [];

  if (symbols && symbols.length > 0) {
    return symbols.map((sym) => {
      const found = base.find(
        (b) => b.symbol.toUpperCase() === sym.toUpperCase()
      );
      if (found) {
        const newPrice = varyValue(found.price, 0.8);
        const prev = found.previousClose ?? found.price;
        const change = Number((newPrice - prev).toFixed(6));
        const changePercent = prev
          ? Number(((change / prev) * 100).toFixed(6))
          : 0;
        return {
          ...found,
          price: newPrice,
          previousClose: prev,
          change,
          changePercent,
          latestTradingDay: new Date().toISOString(),
        };
      }

      // crear mock básico si no hay base
      const randBase = 100 * (1 + Math.random());
      const price = varyValue(randBase, 1.5);
      const prev = Number((price * (1 - 0.002)).toFixed(6));
      const change = Number((price - prev).toFixed(6));
      const changePercent = Number(((change / prev) * 100).toFixed(6));

      return {
        symbol: sym,
        price,
        high: Number((price * 1.01).toFixed(6)),
        low: Number((price * 0.99).toFixed(6)),
        previousClose: prev,
        change,
        changePercent,
        latestTradingDay: new Date().toISOString(),
        market,
      };
    });
  }

  // default: mapear base con variaciones pequeñas
  return base.map((b) => {
    const newPrice = varyValue(b.price, 0.8);
    const prev = b.previousClose ?? b.price;
    const change = Number((newPrice - prev).toFixed(6));
    const changePercent = prev
      ? Number(((change / prev) * 100).toFixed(6))
      : 0;
    return {
      ...b,
      price: newPrice,
      previousClose: prev,
      change,
      changePercent,
      latestTradingDay: new Date().toISOString(),
      market,
    };
  });
}

/* ---------------------- Simulación determinista ligera (para responses reales-cached) ---------------------- */
function smallHash(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function xorshift32(seed: number) {
  let x = seed >>> 0;
  return function () {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x >>>= 0;
    x ^= x << 5;
    x >>>= 0;
    return x / 0xffffffff;
  };
}
function simulatePrices(
  wrapper: CacheWrapper,
  opts?: { maxPctPerMinute?: number; bucketMs?: number }
) {
  const maxPctPerMinute = opts?.maxPctPerMinute ?? 0.25; // 0.25% por minuto
  const bucketMs = opts?.bucketMs ?? 10_000;
  const now = Date.now();
  const elapsedMs = Math.max(0, now - wrapper.ts);
  const elapsedMinutes = elapsedMs / 60000;
  const maxTotalPct = elapsedMinutes * maxPctPerMinute;
  const cappedMaxPct = Math.min(maxTotalPct, Math.max(1, 3 * maxPctPerMinute));
  const bucketIndex = Math.floor(now / bucketMs);

  return wrapper.data.map((q) => {
    if (typeof q.price !== "number" || Number.isNaN(q.price)) return { ...q };
    const seed = (smallHash(q.symbol + "::sim") ^ bucketIndex) >>> 0;
    const rand = xorshift32(seed)();
    const signed = rand * 2 - 1;
    const deltaFraction = signed * (cappedMaxPct / 100);
    const newPrice = q.price * (1 + deltaFraction);
    const newHigh =
      typeof q.high === "number" ? Math.max(q.high, newPrice) : undefined;
    const newLow =
      typeof q.low === "number" ? Math.min(q.low, newPrice) : undefined;
    const prev =
      typeof q.previousClose === "number" ? q.previousClose : q.price;
    const change = newPrice - prev;
    const changePercent = prev !== 0 ? (change / prev) * 100 : 0;
    return {
      ...q,
      price: Number(newPrice.toFixed(6)),
      high: newHigh !== undefined ? Number(newHigh.toFixed(6)) : undefined,
      low: newLow !== undefined ? Number(newLow.toFixed(6)) : undefined,
      change: Number(change.toFixed(6)),
      changePercent: Number(changePercent.toFixed(6)),
    } as Quote;
  });
}

/* ---------------------- Helper to decide if API response is rate-limit/error ---------------------- */
/** ⚠️ Ahora solo se usa dentro de los fetchers, NO en fetchSymbolsForMarketWithFallback */
function isRateLimitOrError(resObj: unknown): boolean {
  if (!resObj || typeof resObj !== "object" || resObj === null) return true;
  const obj = resObj as Record<string, unknown>;
  if ("Note" in obj || "Error Message" in obj) return true;
  if (Object.keys(obj).length === 0) return true;
  return false;
}

/* ---------------------- Fetch symbol set for market (with error handling) ---------------------- */
async function fetchSymbolsForMarketWithFallback(
  market: string
): Promise<{ data: Quote[]; usedMock: boolean }> {
  const symbols =
    market === "all"
      ? Array.from(new Set(Object.values(SYMBOLS_MAP).flat()))
      : SYMBOLS_MAP[market] ?? SYMBOLS_MAP["indices"];

  const results: (Quote | null)[] = [];
  let usedMock = false;

  for (const sym of symbols) {
    try {
      if (market === "crypto") {
        const r = await fetchCryptoQuote(sym, "USD");
        if (r.error) {
          usedMock = true;
          break;
        }
        results.push(r.data);
      } else if (market === "fx") {
        const r = await fetchFxQuote(sym);
        if (r.error) {
          usedMock = true;
          break;
        }
        results.push(r.data);
      } else {
        const r = await fetchGlobalQuote(sym);
        if (r.error) {
          usedMock = true;
          break;
        }
        results.push(r.data);
      }
    } catch (e) {
      console.warn("Fetch error for", sym, e);
      usedMock = true;
      break;
    }
  }

  if (usedMock) {
    // ❌ NO generamos mocks aquí.
    // ✅ Dejamos que el handler GET decida si usa el último wrapper real o mocks.
    throw new Error(`Alpha Vantage rate-limited or failed for market ${market}`);
  }

  return { data: results.filter(Boolean) as Quote[], usedMock: false };
}

/* ---------------------- Handler ---------------------- */
export async function GET(request: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "ALPHA_VANTAGE_API_KEY not configured" },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const marketParam = (url.searchParams.get("market") || "indices").toLowerCase();
  const fromLanding = url.searchParams.get("from") === "landing";

  /* ---------- 1) Modo landing (Investing.com) ---------- */
  if (fromLanding) {
    const marketParamRaw = url.searchParams.get("market") || "Indices";
    const subParam = url.searchParams.get("sub");

    const marketKey = Object.keys(MARKETS).find(
      (k) => k.toLowerCase() === marketParamRaw.toLowerCase()
    );
    const marketData = marketKey
      ? MARKETS[marketKey as keyof typeof MARKETS]
      : undefined;

    if (!marketData) {
      console.warn(`❗ No se encontró el mercado: ${marketParamRaw}`);
      const symbols =
        SYMBOLS_MAP[marketParamRaw.toLowerCase()]?.slice(0, 3) ?? [];
      const data = getDynamicMock(marketParamRaw.toLowerCase(), symbols);
      return NextResponse.json(data, { status: 200 });
    }

    const normalizeSubKey = (sub?: string) =>
      sub ? sub.replace(/\s+/g, "_").toLowerCase() : "";

    const subKey = normalizeSubKey(subParam as string);
    let urlApi: string | undefined;

    if (subKey && typeof marketData === "object" && subKey in marketData) {
      const subMarket = (marketData as any)[subKey];
      if (subMarket?.getUrlMarkets) urlApi = subMarket.getUrlMarkets();
      else urlApi = marketData.getUrlMarkets();
    } else {
      urlApi = marketData.getUrlMarkets();
    }

    try {
      const res = await fetch(urlApi!, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
          Referer: "https://www.miAPI.com",
          Origin: "https://www.miAPI.com",
          Host: "www.miAPI.com",
        },
      });
      const data = await res.json();
      return NextResponse.json(data.data, { status: 200 });
    } catch (err) {
      console.error("Error fetching landing data:", err);
      const symbols =
        SYMBOLS_MAP[marketParamRaw.toLowerCase()]?.slice(0, 3) ?? [];
      const data = getDynamicMock(marketParamRaw.toLowerCase(), symbols);
      return NextResponse.json(data, { status: 200 });
    }
  }

  /* ---------- 2) Modo trading (dashboard) ---------- */

  const market =
    marketParam in SYMBOLS_MAP ? marketParam : ("indices" as keyof typeof SYMBOLS_MAP);
  const cacheKey = `market-${market}`;

  // 1) Try cache with meta
  try {
    const wrapper = await getCacheWithMeta(cacheKey);
    if (wrapper) {
      const simulated = simulatePrices(wrapper, {
        maxPctPerMinute: 0.25,
        bucketMs: 10000,
      });
      return NextResponse.json(simulated, { status: 200 });
    }
  } catch (err) {
    console.warn("Cache read error (ignored):", err);
  }

  // 2) If an inflight promise exists, wait and then return simulation on the cache
  const inflight = inflightRequests.get(cacheKey);
  if (inflight) {
    try {
      await inflight;
      const wrapper = await getCacheWithMeta(cacheKey);
      if (wrapper) {
        const simulated = simulatePrices(wrapper, {
          maxPctPerMinute: 0.25,
          bucketMs: 10000,
        });
        return NextResponse.json(simulated, { status: 200 });
      }
    } catch (e) {
      inflightRequests.delete(cacheKey);
      console.warn("Inflight promise failed, continuing to fetch fresh", e);
    }
  }

  // 3) Launch a fresh fetch (only one will run due to inflightRequests)
  const prom = (async () => {
    try {
      const { data } = await fetchSymbolsForMarketWithFallback(market);

      try {
        await setCacheWithMeta(cacheKey, data, CACHE_TTL_SEC);
      } catch (err) {
        console.warn("Cache set failed (ignored):", err);
      }

      return data;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, prom);

  try {
    const data = await prom;
    const wrapper = await getCacheWithMeta(cacheKey);
    if (wrapper) {
      const simulated = simulatePrices(wrapper, {
        maxPctPerMinute: 0.25,
        bucketMs: 10000,
      });
      return NextResponse.json(simulated, {
        status: 200,
        headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL_SEC}` },
      });
    }
    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL_SEC}` },
    });
  } catch (err: unknown) {
    console.error("market-data final error", err);

    // 1️⃣ Intentar reutilizar el ÚLTIMO wrapper conocido (último valor real)
    try {
      const wrapper = await getCacheWithMeta(cacheKey);
      if (wrapper) {
        const simulated = simulatePrices(wrapper, {
          maxPctPerMinute: 0.25,
          bucketMs: 10000,
        });
        return NextResponse.json(simulated, { status: 200 });
      }
    } catch (e) {
      console.warn("Error reading previous cache wrapper:", e);
    }

    // 2️⃣ Si NUNCA hemos tenido datos en caché, recién ahí usamos mocks
    const symbols =
      market === "all"
        ? Array.from(new Set(Object.values(SYMBOLS_MAP).flat()))
        : SYMBOLS_MAP[market] ?? [];
    const fallback = getDynamicMock(market, symbols);

    try {
      await setCacheWithMeta(cacheKey, fallback, CACHE_TTL_SEC);
    } catch {
      /* ignore */
    }
    return NextResponse.json(fallback, {
      status: 200,
      headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL_SEC}` },
    });
  }
}
