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
  ts: number;          // último update (real o simulado)
  data: Quote[];
  anchorTs?: number;   // último snapshot REAL confirmado
};

/* ===================== Config ===================== */

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY!;
const ALPHA_RPM = Number(process.env.ALPHA_RPM ?? 500);
const REQUEST_INTERVAL_MS = Math.ceil(60_000 / ALPHA_RPM);

const CACHE_TTL_SEC = 300;
const CACHE_TTL_MS = CACHE_TTL_SEC * 1000;
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

async function setCache(
  key: string,
  data: Quote[],
  isReal = false
) {
  const prev = await getCache(key);

  const wrapper: CacheWrapper = {
    ts: Date.now(),
    data,
    anchorTs: isReal
      ? Date.now()
      : prev?.anchorTs,
  };

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(wrapper), {
        ex: CACHE_TTL_SEC,
      });
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

  if (
    !res.ok ||
    !json ||
    json["Error Message"] ||
    json.Note
  ) {
    if (json?.Note) {
      alphaBlockedUntil = Date.now() + 60_000;
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

/* ===================== Simulation ===================== */

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

/* ===================== Mock Derivado ===================== */

function deriveMock(
  wrapper: CacheWrapper,
  market: string
): Quote[] {
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

/* ===================== Base Mock ===================== */

function getBaseMock(
  market: string,
  symbols: string[]
): Quote[] {
  return symbols.map((s) => {
    const base =
      MOCK_BASE[market]?.find((b) => b.symbol === s)?.price ??
      100;

    return {
      symbol: s,
      price: base,
      latestTradingDay: new Date().toISOString(),
      source: "mock",
      market,
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
    await sleep(REQUEST_INTERVAL_MS);
  }

  return results;
}

/* ===================== Handler ===================== */

export async function GET(req: Request) {
  const market =
    new URL(req.url).searchParams.get("market") ?? "crypto";
  const key = `market-${market}`;

  const cached = await getCache(key);

  // 1️⃣ Cache
  if (cached) {
    return NextResponse.json(
      isFresh(cached)
        ? cached.data
        : simulate(cached),
      { status: 200 }
    );
  }

  // 2️⃣ Inflight
  if (inflight.has(key)) {
    await inflight.get(key);
    const again = await getCache(key);
    if (again) {
      return NextResponse.json(
        isFresh(again)
          ? again.data
          : simulate(again),
        { status: 200 }
      );
    }
  }

  // 3️⃣ Fetch real
  const p = (async () => {
    const data = await fetchMarket(market);
    await setCache(key, data, true);
    return data;
  })();

  inflight.set(key, p);

  try {
    const data = await p;
    return NextResponse.json(data, { status: 200 });
  } catch {
    let fallback: Quote[];

    if (cached) {
      const c = cached as CacheWrapper;
      fallback = c.anchorTs
        ? deriveMock(c, market)
        : simulate(c);
    } else {
      fallback = getBaseMock(
        market,
        SYMBOLS_MAP[market] ?? []
      );
    }

    await setCache(key, fallback);
    return NextResponse.json(fallback, { status: 200 });
  } finally {
    inflight.delete(key);
  }
}
