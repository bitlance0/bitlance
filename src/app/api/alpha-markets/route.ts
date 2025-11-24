// src/app/api/alpha-markets/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import SYMBOLS_MAP from "@/lib/symbolsMap";

export const runtime = "edge";

type MarketEs = keyof typeof SYMBOLS_MAP;

export type Quote = {
  symbol: string;
  price: number;
  high?: number;
  low?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  latestTradingDay?: string;
  // isClosed se deja opcional por compatibilidad, pero NO se calcula
  isClosed?: boolean;
  market?: MarketEs | "fx" | "crypto";
};

type CacheWrapper = { ts: number; data: Quote };

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY!;
const DEFAULT_TTL_SEC = parseInt(process.env.MARKETS_CACHE_TTL_SEC ?? "300", 10);
const MAX_CONCURRENCY = parseInt(
  process.env.MARKETS_MAX_CONCURRENCY ?? "10",
  10
);

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
try {
  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (e) {
  console.warn("Upstash init failed, fallback to memory:", e);
  redis = null;
}
const memoryCache = new Map<string, CacheWrapper>();

const keyFor = (market: MarketEs, symbol: string) =>
  `av:${market}:${symbol.toUpperCase()}`;

/* ----------------- Helpers de cache ----------------- */
async function getCache(
  key: string,
  ttlSec: number
): Promise<CacheWrapper | null> {
  const ttlMs = ttlSec * 1000;

  if (redis) {
    try {
      const raw = await redis.get<any>(key);
      if (!raw) return null;

      const parsed: any =
        typeof raw === "string"
          ? (() => {
              try {
                return JSON.parse(raw);
              } catch {
                return null;
              }
            })()
          : raw;

      if (
        !parsed ||
        typeof parsed !== "object" ||
        typeof parsed.ts !== "number" ||
        !parsed.data
      ) {
        await redis.del(key).catch(() => {});
        return null;
      }
      if (Date.now() - parsed.ts > ttlMs) {
        await redis.del(key).catch(() => {});
        return null;
      }
      return parsed as CacheWrapper;
    } catch (e) {
      console.warn("Redis get error (meta):", e);
    }
  }

  const local = memoryCache.get(key);
  if (!local) return null;
  if (Date.now() - local.ts > ttlMs) {
    memoryCache.delete(key);
    return null;
  }
  return local;
}

async function setCache(
  key: string,
  data: Quote,
  ttlSec: number
): Promise<void> {
  const wrapper: CacheWrapper = { ts: Date.now(), data };
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(wrapper), { ex: ttlSec });
      return;
    } catch (e) {
      console.warn("Redis set error (meta):", e);
    }
  }
  memoryCache.set(key, wrapper);
}

/* ----------------- Helpers Alpha Vantage ----------------- */
async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const isAVError = (json: any) =>
  !json || typeof json !== "object" || json.Note || json["Error Message"];

function normalizeInputSymbol(sym: string): string {
  const s = sym.toUpperCase();
  if (s === "FB") return "META"; // alias común
  return s;
}

/** Extrae "YYYY-MM-DD" de distintos formatos de fecha (solo para metadata) */
function extractDatePart(value?: string): string | null {
  if (!value) return null;
  const str = value.trim();
  if (!str) return null;
  if (str.includes("T")) return str.split("T")[0] || null;
  if (str.includes(" ")) return str.split(" ")[0] || null;
  if (str.length >= 10) return str.slice(0, 10);
  return null;
}

/* ----------------- Fetchers por tipo de activo ----------------- */
async function fetchGlobalQuote(rawSymbol: string) {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
    rawSymbol
  )}&apikey=${API_KEY}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await safeJson(res);
  if (!res.ok || isAVError(json))
    throw new Error(
      json?.Note || json?.["Error Message"] || `HTTP ${res.status}`
    );
  return json["Global Quote"];
}

/**
 * Equity / ETF / Índices (SPY, QQQ, AAPL, etc.)
 * Siempre usa el último precio real que devuelve Alpha (05. price),
 * sin marcar ni interpretar isClosed por fecha.
 */
async function fetchQuoteEquityEtf(
  symbol: string,
  market: MarketEs
): Promise<Quote> {
  const q = await fetchGlobalQuote(symbol);

  const price = parseFloat(q?.["05. price"] ?? "0");
  const prev = parseFloat(q?.["08. previous close"] ?? "0");
  const high = parseFloat(q?.["03. high"] ?? (price || "0"));
  const low = parseFloat(q?.["04. low"] ?? (price || "0"));
  const change =
    q?.["09. change"] != null ? parseFloat(q["09. change"]) : price - prev;
  const changePercent = parseFloat(
    (q?.["10. change percent"] ?? "0%").replace("%", "")
  );

  const latestTradingDayRaw =
    q?.["07. latest trading day"] ?? new Date().toISOString();
  const latestTradingDay =
    extractDatePart(latestTradingDayRaw) ?? latestTradingDayRaw;

  return {
    symbol,
    price,
    high,
    low,
    previousClose: prev,
    change,
    changePercent,
    latestTradingDay,
    // isClosed NO se calcula: dejamos undefined
    market,
  };
}

/**
 * FX: EURUSD, USDJPY, etc.
 * Usamos el último Exchange Rate real de Alpha.
 */
async function fetchQuoteFx(pair: string): Promise<Quote> {
  const from = pair.slice(0, 3).toUpperCase();
  const to = pair.slice(3).toUpperCase();
  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${API_KEY}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await safeJson(res);
  if (!res.ok || isAVError(json) || !json?.["Realtime Currency Exchange Rate"]) {
    throw new Error(
      json?.Note || json?.["Error Message"] || `HTTP ${res.status}`
    );
  }

  const data = json["Realtime Currency Exchange Rate"];
  const price = parseFloat(data["5. Exchange Rate"] ?? "0");
  const timestamp = data["6. Last Refreshed"] ?? new Date().toISOString();
  const latestTradingDay =
    extractDatePart(timestamp) ?? timestamp ?? new Date().toISOString();

  return {
    symbol: `${from}${to}`,
    price,
    high: price,
    low: price,
    previousClose: price, // Alpha no da previous close aquí
    change: 0,
    changePercent: 0,
    latestTradingDay,
    // isClosed no se usa
    market: "fx",
  };
}

/**
 * Crypto vs USD: BTC, ETH, etc.
 * Usamos DIGITAL_CURRENCY_DAILY → último día disponible (cierre diario real).
 */
async function fetchQuoteCryptoUSD(symbol: string): Promise<Quote> {
  const sym = symbol.toUpperCase();
  const url = `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${encodeURIComponent(
    sym
  )}&market=USD&apikey=${API_KEY}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await safeJson(res);
  const series = json?.["Time Series (Digital Currency Daily)"];
  if (!res.ok || isAVError(json) || !series) {
    throw new Error(
      json?.Note || json?.["Error Message"] || `HTTP ${res.status}`
    );
  }

  const latestKey = Object.keys(series)[0];
  const latest = series[latestKey];

  const price = parseFloat(latest["4a. close (USD)"] ?? "0");
  const high = parseFloat(latest["2a. high (USD)"] ?? (price || "0"));
  const low = parseFloat(latest["3a. low (USD)"] ?? (price || "0"));
  const latestTradingDay =
    extractDatePart(latestKey) ?? latestKey ?? new Date().toISOString();

  return {
    symbol: sym,
    price,
    high,
    low,
    previousClose: price,
    change: 0,
    changePercent: 0,
    latestTradingDay,
    // isClosed no se usa (crypto 24/7, pero ya no lo marcamos)
    market: "crypto",
  };
}

/* ----------------- Pool de concurrencia ----------------- */
async function withPool<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0,
    active = 0;

  return new Promise((resolve) => {
    const start = () => {
      while (active < concurrency && next < tasks.length) {
        const cur = next++;
        active++;
        tasks[cur]()
          .then((r) => (results[cur] = r))
          .catch((e) => (results[cur] = e as unknown as T))
          .finally(() => {
            active--;
            next >= tasks.length && active === 0 ? resolve(results) : start();
          });
      }
    };
    start();
  });
}

/* ----------------- Handler principal ----------------- */
export async function GET(request: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "ALPHA_VANTAGE_API_KEY not configured" },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const marketParam = (url.searchParams.get("market") || "").toLowerCase() as MarketEs;
  const ttl = Math.max(
    5,
    parseInt(url.searchParams.get("ttl") || `${DEFAULT_TTL_SEC}`, 10)
  );
  const revalidate = url.searchParams.get("revalidate") === "1";
  const rawSymbols = (url.searchParams.get("symbols") || "").trim();

  if (!marketParam || !(marketParam in SYMBOLS_MAP)) {
    return NextResponse.json(
      {
        error: "market_invalido",
        message: `Market no soportado. Usa uno de: ${Object.keys(
          SYMBOLS_MAP
        ).join(", ")}`,
      },
      { status: 400 }
    );
  }

  const market = marketParam;
  const allowed = SYMBOLS_MAP[market];

  let requested: string[] = [];
  if (rawSymbols) {
    requested = rawSymbols
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const normalized = requested.map(normalizeInputSymbol);
    const allow = new Set(allowed.map((a) => a.toUpperCase()));
    requested = normalized.filter((n) => allow.has(n.toUpperCase()));

    if (!requested.length) {
      return NextResponse.json(
        {
          error: "symbols_invalidos",
          message:
            "Ninguno de los símbolos solicitados está permitido por symbolsMap.",
        },
        { status: 400 }
      );
    }
  } else {
    requested = allowed.map(normalizeInputSymbol);
  }

  // Intento de cache por símbolo
  const cached: Array<Quote | null> = await Promise.all(
    requested.map(async (s) => {
      if (revalidate) return null;
      const c = await getCache(keyFor(market, s), ttl);
      return c?.data ?? null;
    })
  );

  // Tareas para cada símbolo (usa cache cuando exista)
  const tasks: Array<() => Promise<Quote>> = requested.map((sym, idx) => {
    if (cached[idx]) return async () => cached[idx] as Quote;
    return async () => {
      let q: Quote;
      if (market === "fx") q = await fetchQuoteFx(sym);
      else if (market === "crypto") q = await fetchQuoteCryptoUSD(sym);
      else q = await fetchQuoteEquityEtf(sym, market);

      await setCache(keyFor(market, sym), q, ttl);
      return q;
    };
  });

  const settled = await withPool(tasks, MAX_CONCURRENCY);

  const out: Quote[] = [];
  settled.forEach((v, i) => {
    if (v && typeof (v as any).price === "number") out.push(v as Quote);
    else console.warn(`Fetch error ${requested[i]}:`, v);
  });

  if (!out.length) {
    return NextResponse.json(
      {
        error: "upstream_error",
        message:
          "No se pudo obtener data de Alpha Vantage para los símbolos solicitados.",
      },
      { status: 502 }
    );
  }

  // Guarda snapshot agregado por mercado para el SSE (sin isClosed)
  if (redis) {
    try {
      const key = `alpha:market:${market}`;
      const wrapperAll = { ts: Date.now(), data: out };
      await redis.set(key, JSON.stringify(wrapperAll), { ex: ttl });
    } catch (e) {
      console.warn("Redis set error (snapshot SSE):", e);
    }
  } else {
    const key = `alpha:market:${market}`;
    (globalThis as any).__alpha_cache ??= new Map<string, any>();
    (globalThis as any).__alpha_cache.set(key, {
      ts: Date.now(),
      data: out,
    });
  }

  return NextResponse.json(out, {
    status: 200,
    headers: {
      "Cache-Control": `public, s-maxage=${ttl}`,
      "X-Cache": cached.some(Boolean) ? "PARTIAL-HIT" : "MISS",
    },
  });
}
