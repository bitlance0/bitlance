import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { MOCK_BASE } from "@/lib/mockData";
import SYMBOLS_MAP from "@/lib/symbolsMap";

/* ===================== Types ===================== */

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
};

/* ===================== Config ===================== */

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY!;

// Alpha plan pago → configurable
const ALPHA_RPM = Number(process.env.ALPHA_RPM ?? 500);
const REQUEST_INTERVAL_MS = Math.ceil(60_000 / ALPHA_RPM);

// cache
const CACHE_TTL_SEC = 300;
const CACHE_TTL_MS = CACHE_TTL_SEC * 1000;

// ventana de datos reales
const REAL_WINDOW_MS = 15_000;

/* ===================== Redis / Memory ===================== */

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

/* ===================== Alpha Guard ===================== */

// backoff global (simple y efectivo en serverless)
let alphaBlockedUntil = 0;

function alphaAvailable() {
  return Date.now() > alphaBlockedUntil;
}

/* ===================== Utils ===================== */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isFresh(wrapper: CacheWrapper) {
  return Date.now() - wrapper.ts < REAL_WINDOW_MS;
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/* ===================== Cache helpers ===================== */

async function getCache(key: string): Promise<CacheWrapper | null> {
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (raw) {
        return typeof raw === "string"
          ? (JSON.parse(raw) as CacheWrapper)
          : (raw as CacheWrapper);
      }
    } catch {}
  }

  const local = memoryCache.get(key);
  if (!local) return null;

  if (Date.now() - local.ts > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }

  return local;
}

async function setCache(key: string, data: Quote[]) {
  const wrapper: CacheWrapper = { ts: Date.now(), data };

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(wrapper), { ex: CACHE_TTL_SEC });
      return;
    } catch {}
  }

  memoryCache.set(key, wrapper);
}

/* ===================== Alpha Vantage ===================== */

async function fetchCrypto(symbol: string): Promise<Quote> {
  if (!alphaAvailable()) {
    throw new Error("alpha_blocked");
  }

  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${API_KEY}`;
  const res = await fetch(url);
  const json = await safeJson(res);

  // Alpha NO siempre devuelve 429
  if (
    !res.ok ||
    !json ||
    json["Error Message"] ||
    json.Note
  ) {
    if (json?.Note) {
      alphaBlockedUntil = Date.now() + 60_000; // 1 min
      throw new Error("rate_limited");
    }
    throw new Error("alpha_failed");
  }

  const rate = json["Realtime Currency Exchange Rate"];
  const price = parseFloat(rate["5. Exchange Rate"]);

  if (!Number.isFinite(price)) {
    throw new Error("invalid_price");
  }

  return {
    symbol,
    price,
    latestTradingDay: rate["6. Last Refreshed"],
    source: "real",
    market: "crypto",
  };
}

/* ===================== Mock ===================== */

function vary(price: number, pct = 0.6) {
  return Number(
    (price * (1 + (Math.random() * 2 - 1) * pct / 100)).toFixed(6)
  );
}

function getMock(market: string, symbols: string[]): Quote[] {
  return symbols.map((s) => {
    const base = MOCK_BASE[market]?.find((b) => b.symbol === s)?.price ?? 100;
    const price = vary(base, 1.2);
    const prev = base;

    return {
      symbol: s,
      price,
      previousClose: prev,
      change: price - prev,
      changePercent: ((price - prev) / prev) * 100,
      latestTradingDay: new Date().toISOString(),
      source: "mock",
      market,
    };
  });
}

/* ===================== Simulation ===================== */

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
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

const VOLATILITY_BY_MARKET: Record<string, number> = {
  crypto: 1.0,
  fx: 0.3,
  indices: 0.2,
  stocks: 0.4,
};

function simulate(wrapper: CacheWrapper): Quote[] {
  const now = Date.now();
  const bucket = Math.floor(now / 10_000);
  const elapsedMin = (now - wrapper.ts) / 60_000;
  const maxPct = Math.min(elapsedMin * 0.25, 0.75) / 100;
  const smooth = Math.min(elapsedMin / 2, 1);

  return wrapper.data.map((q) => {
    const seed = hash(q.symbol + bucket);
    const rand = ((seed % 1000) / 1000) * 2 - 1;

    const market = q.market ?? "crypto";
    const vol = VOLATILITY_BY_MARKET[market] ?? 1;

    const pctDelta = q.price * rand * maxPct * vol;
    const absCap = maxAbsDelta(q.price);
    const delta = Math.max(-absCap, Math.min(absCap, pctDelta)) * smooth;

    const price = q.price + delta;
    const prev = q.previousClose ?? q.price;

    return {
      ...q,
      price: Number(price.toFixed(6)),
      high: q.high ? Math.max(q.high, price) : price,
      low: q.low ? Math.min(q.low, price) : price,
      change: price - prev,
      changePercent: ((price - prev) / prev) * 100,
      source: "simulated",
    };
  });
}

/* ===================== Fetch Market ===================== */

async function fetchMarket(market: string): Promise<Quote[]> {
  const symbols = SYMBOLS_MAP[market] ?? [];
  const results: Quote[] = [];

  for (const s of symbols) {
    const q = await fetchCrypto(s);
    results.push(q);
    await sleep(REQUEST_INTERVAL_MS); // throttle garantizado
  }

  return results;
}

/* ===================== Handler ===================== */

export async function GET(req: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Missing API key" },
      { status: 500 }
    );
  }

  const market =
    new URL(req.url).searchParams.get("market") ?? "crypto";
  const key = `market-${market}`;

  const cached = await getCache(key);

  // 1️⃣ Cache
  if (cached) {
    return NextResponse.json(
      isFresh(cached) ? cached.data : simulate(cached),
      { status: 200 }
    );
  }

  // 2️⃣ Inflight
  if (inflight.has(key)) {
    await inflight.get(key);
    const again = await getCache(key);
    if (again) {
      return NextResponse.json(
        isFresh(again) ? again.data : simulate(again),
        { status: 200 }
      );
    }
  }

  // 3️⃣ Fetch real
  const p = (async () => {
    const data = await fetchMarket(market);
    await setCache(key, data);
    return data;
  })();

  inflight.set(key, p);

  try {
    const data = await p;
    return NextResponse.json(data, { status: 200 });
  } catch {
    const fallback = cached
      ? simulate(cached)
      : getMock(market, SYMBOLS_MAP[market] ?? []);

    await setCache(key, fallback);
    return NextResponse.json(fallback, { status: 200 });
  } finally {
    inflight.delete(key);
  }
}
