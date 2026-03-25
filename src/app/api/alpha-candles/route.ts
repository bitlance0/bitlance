import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import exchangeMetaJson from "@/data/itick/exchange-meta.json";

type Candle = {
  time: number; // seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  turnover?: number;
};

type ItickKlineItem = {
  t: number; // milliseconds
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
  tu?: number;
};

type ItickKlineResponse = {
  code: number;
  msg: string | null;
  data: ItickKlineItem[] | null;
};

type ExchangeMeta = Record<
  string,
  {
    label?: string;
    scope?: string;
    market?: string;
    region?: string;
    apiType?: string;
  }
>;

const exchangeMeta = exchangeMetaJson as ExchangeMeta;
const ITICK_API_URL = process.env.ITICK_API_URL ?? "https://api.itick.org";
const ITICK_API_KEY = process.env.ITICK_API_KEY ?? "";
const CACHE_TTL = 60 * 5;
const HIST_WINDOW = 60;

// --------------------------------------------
// Legacy AlphaVantage reference (rollback rápido)
// --------------------------------------------
// const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
// Endpoint legacy usado antes:
// /api/alpha-candles?symbol=...&interval=...
// Proveedor legacy:
// https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY...
// --------------------------------------------

function normalizeMarket(market: string | null) {
  const m = (market ?? "").toLowerCase();
  if (m === "fx" || m === "forex") return "forex";
  if (m === "acciones" || m === "stock") return "acciones";
  if (m === "commodities" || m === "future") return "commodities";
  if (m === "indices") return "indices";
  if (m === "crypto") return "crypto";
  if (m === "all" || m === "funds" || m === "fund") return "funds";
  if (m === "favoritas" || m === "favorite" || m === "favorites") return "favoritas";
  return "";
}

function inferMarketFromSymbol(symbol: string) {
  const s = symbol.toUpperCase();
  if (s.endsWith("USDT")) return "crypto";
  if (/^[A-Z]{6}$/.test(s)) return "forex";
  return "acciones";
}

function resolveNormalizedMarket(
  market: string | null,
  symbol: string,
  exchange: string | null
) {
  const normalized = normalizeMarket(market);
  if (normalized && normalized !== "favoritas") return normalized;

  if (exchange) {
    const fromExchange = normalizeMarket(exchangeMeta?.[exchange]?.market ?? null);
    if (fromExchange && fromExchange !== "favoritas") return fromExchange;
  }

  return inferMarketFromSymbol(symbol);
}

function resolveApiType(market: string) {
  switch (normalizeMarket(market)) {
    case "forex":
      return "forex";
    case "indices":
      return "indices";
    case "crypto":
      return "crypto";
    case "commodities":
      return "future";
    case "funds":
      return "fund";
    case "acciones":
    default:
      return "stock";
  }
}

function intervalToKType(interval: string) {
  switch (interval) {
    case "1min":
      return 1;
    case "5min":
      return 2;
    case "15min":
      return 3;
    case "30min":
      return 4;
    case "60min":
      return 5;
    default:
      return 2;
  }
}

function normalizeRegion(
  scope: string | null,
  exchange: string | null,
  market: string
) {
  if (exchange) {
    const fromExchange = exchangeMeta?.[exchange]?.region;
    if (fromExchange) return fromExchange.toUpperCase();
  }

  if (scope) {
    const s = scope.toUpperCase();
    if (s === "GLOBAL") return "GB";
    return s;
  }

  if (market === "crypto") return "BA";
  if (market === "forex") return "GB";
  return "US";
}

function toReferenceSeconds(value: string | null): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Math.floor(Number(value));

  const d = new Date(value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 1000);
}

function sanitizeLimit(input: string | null, historical: boolean) {
  const defaultLimit = historical ? 500 : 300;
  const parsed = Number(input ?? defaultLimit);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultLimit;
  return Math.min(Math.floor(parsed), 1000);
}

function removeDuplicatesAndSort(candles: Candle[]): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of candles) map.set(c.time, c);
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

function mapKlineRows(rows: ItickKlineItem[]): Candle[] {
  return rows
    .filter(
      (row) =>
        row &&
        typeof row.t === "number" &&
        Number.isFinite(row.o) &&
        Number.isFinite(row.h) &&
        Number.isFinite(row.l) &&
        Number.isFinite(row.c)
    )
    .map((row) => ({
      time: Math.floor(row.t / 1000),
      open: Number(row.o),
      high: Number(row.h),
      low: Number(row.l),
      close: Number(row.c),
      volume: row.v !== undefined ? Number(row.v) : undefined,
      turnover: row.tu !== undefined ? Number(row.tu) : undefined,
    }));
}

function applyHistoricalWindow(
  candles: Candle[],
  direction: "forward" | "backward",
  referenceTime: number
) {
  if (direction === "backward") {
    const prev = candles.filter((c) => c.time < referenceTime);
    return prev.slice(-Math.min(HIST_WINDOW, prev.length));
  }

  const next = candles.filter((c) => c.time > referenceTime);
  return next.slice(0, Math.min(HIST_WINDOW, next.length));
}

function isRateLimited(status: number, json: ItickKlineResponse | null, raw: string) {
  if (status === 429) return true;
  const msg = (json?.msg ?? "").toLowerCase();
  const text = (raw ?? "").toLowerCase();
  return msg.includes("request limit exceeded") || text.includes("request limit exceeded");
}

function isPackageUnavailable(json: ItickKlineResponse | null, raw: string) {
  const msg = (json?.msg ?? "").toLowerCase();
  const text = (raw ?? "").toLowerCase();
  return msg.includes("only supports subscribing to") || text.includes("only supports subscribing to");
}

async function getCachedData(cacheKey: string): Promise<Candle[] | null> {
  if (!redis) return null;

  try {
    const cached = await redis.get(cacheKey);
    if (!cached) return null;

    if (typeof cached === "string") {
      return JSON.parse(cached) as Candle[];
    }

    if (Array.isArray(cached)) {
      return cached as Candle[];
    }

    if ((cached as any).value && Array.isArray((cached as any).value)) {
      return (cached as any).value as Candle[];
    }

    return null;
  } catch {
    return null;
  }
}

async function setCachedData(cacheKey: string, data: Candle[]) {
  if (!redis) return;

  try {
    await redis.set(cacheKey, JSON.stringify(data), { ex: CACHE_TTL });
  } catch {}
}

type KlineAttemptContext = {
  market: string;
  apiType: string;
  region: string;
};

type KlineAttemptResult = {
  status: number;
  rawText: string;
  json: ItickKlineResponse | null;
  context: KlineAttemptContext;
};

function buildContextCandidates(params: {
  symbol: string;
  market: string;
  scope: string | null;
  exchange: string | null;
}) {
  const { symbol, market, scope, exchange } = params;
  const normalizedExchange = String(exchange ?? "").trim().toUpperCase() || null;
  const inferredMarket = inferMarketFromSymbol(symbol);
  const exchangeMarket = normalizedExchange
    ? normalizeMarket(exchangeMeta?.[normalizedExchange]?.market ?? null)
    : "";

  const candidates: KlineAttemptContext[] = [];
  const seen = new Set<string>();

  const push = (candidateMarket: string, candidateRegion: string) => {
    const normalizedCandidateMarket = normalizeMarket(candidateMarket);
    const normalizedCandidateRegion = String(candidateRegion ?? "")
      .trim()
      .toUpperCase();
    if (!normalizedCandidateMarket || !normalizedCandidateRegion) return;

    const apiType = resolveApiType(normalizedCandidateMarket);
    const key = `${normalizedCandidateMarket}|${apiType}|${normalizedCandidateRegion}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({
      market: normalizedCandidateMarket,
      apiType,
      region: normalizedCandidateRegion,
    });
  };

  push(market, normalizeRegion(scope, normalizedExchange, market));

  if (normalizedExchange) {
    const exchangeRegion = String(exchangeMeta?.[normalizedExchange]?.region ?? "")
      .trim()
      .toUpperCase();
    if (exchangeMarket && exchangeRegion) {
      push(exchangeMarket, exchangeRegion);
    }
  }

  push(inferredMarket, normalizeRegion(null, null, inferredMarket));

  if (market === "crypto") {
    push("crypto", "BA");
  } else if (market === "forex") {
    push("forex", "GB");
  }

  return candidates;
}

async function fetchKlineAttempt(params: {
  symbol: string;
  kType: number;
  limit: number;
  context: KlineAttemptContext;
}) {
  const { symbol, kType, limit, context } = params;
  const url = `${ITICK_API_URL}/${context.apiType}/kline?region=${encodeURIComponent(
    context.region
  )}&code=${encodeURIComponent(symbol)}&kType=${kType}&limit=${limit}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      token: ITICK_API_KEY,
    },
    cache: "no-store",
  });

  const rawText = await res.text();
  let json: ItickKlineResponse | null = null;
  try {
    json = JSON.parse(rawText) as ItickKlineResponse;
  } catch {
    json = null;
  }

  return {
    status: res.status,
    rawText,
    json,
    context,
  } as KlineAttemptResult;
}

export async function GET(req: Request) {
  if (!ITICK_API_KEY) {
    return NextResponse.json(
      { error: "ITICK_API_KEY no configurada" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "").trim().toUpperCase();
  const interval = (searchParams.get("interval") ?? "5min").trim();
  const market = searchParams.get("market");
  const scope = searchParams.get("scope");
  const exchange = searchParams.get("exchange");
  const historical = searchParams.get("historical") === "true";
  const direction = searchParams.get("direction") as "forward" | "backward" | null;
  const referenceTimeRaw = searchParams.get("referenceTime");
  const limit = sanitizeLimit(searchParams.get("limit"), historical);

  if (!symbol) {
    return NextResponse.json(
      { error: "Parametro requerido: symbol" },
      { status: 400 }
    );
  }

  const normalizedMarket = resolveNormalizedMarket(market, symbol, exchange);
  const kType = intervalToKType(interval);
  const referenceTime = toReferenceSeconds(referenceTimeRaw);

  const primaryRegion = normalizeRegion(scope, exchange, normalizedMarket);

  const cacheKey = [
    "itick:candles:v1",
    normalizedMarket,
    primaryRegion,
    exchange ?? "-",
    symbol,
    interval,
    historical ? "hist" : "snapshot",
    direction ?? "-",
    referenceTime ?? "-",
    limit,
  ].join(":");

  const cached = await getCachedData(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  try {
    const contexts = buildContextCandidates({
      symbol,
      market: normalizedMarket,
      scope,
      exchange,
    });

    let packageUnavailable = false;
    let hadEmptySuccess = false;
    let lastErrorDetail: string | null = null;
    let selectedData: Candle[] = [];

    for (const context of contexts) {
      const attempt = await fetchKlineAttempt({
        symbol,
        kType,
        limit,
        context,
      });

      if (isRateLimited(attempt.status, attempt.json, attempt.rawText)) {
        return NextResponse.json(
          { error: "Limite de API iTICK alcanzado" },
          { status: 429 }
        );
      }

      if (isPackageUnavailable(attempt.json, attempt.rawText)) {
        packageUnavailable = true;
        lastErrorDetail = attempt.json?.msg ?? attempt.rawText;
        continue;
      }

      if (
        attempt.status >= 200 &&
        attempt.status < 300 &&
        attempt.json?.code === 0 &&
        Array.isArray(attempt.json.data)
      ) {
        const parsed = removeDuplicatesAndSort(mapKlineRows(attempt.json.data));
        if (parsed.length) {
          selectedData = parsed;
          break;
        }
        hadEmptySuccess = true;
        continue;
      }

      lastErrorDetail = attempt.json?.msg ?? attempt.rawText;
    }

    if (!selectedData.length) {
      if (packageUnavailable) {
        return NextResponse.json(
          { error: "Mercado no disponible por plan de suscripcion iTICK" },
          { status: 403 }
        );
      }

      if (hadEmptySuccess) {
        return NextResponse.json(
          { error: "No se encontraron velas para este simbolo" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: "iTICK no devolvio velas validas",
          detail: lastErrorDetail ?? "no_valid_payload",
        },
        { status: 502 }
      );
    }

    let data = selectedData;
    if (historical && direction && referenceTime) {
      data = applyHistoricalWindow(selectedData, direction, referenceTime);
    }

    if (!data.length) {
      return NextResponse.json([], { status: 200 });
    }

    await setCachedData(cacheKey, data);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error consultando velas iTICK",
        detail: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}
