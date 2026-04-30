// src/app/api/itick/markets/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import symbolMetaJson from "@/data/itick/itick_symbol_meta.json";
import marketNavigation from "@/data/itick/market-navigation.json";
import { getRequestConfig, getSymbolsForSelection } from "@/lib/itick/itickServerHelpers";

const DEFAULT_LIMIT = 9;
const FALLBACK_CHUNK_SIZE = 3;
const ITICK_CACHE_WINDOW_MS = Number(process.env.ITICK_MARKETS_CACHE_WINDOW_MS ?? 120_000);
const ITICK_CACHE_TTL_SEC = Number(process.env.ITICK_MARKETS_CACHE_TTL_SEC ?? 600);
const NO_MARKET_DATA_MESSAGE = "iTICK no devolvió datos para esta región/símbolos";

type ItickTickItem = {
  s: string;
  ld?: number;
  t?: number;
  v?: number;
  tu?: number;
  ts?: number;
};

type ItickResponse = {
  code: number;
  msg: string | null;
  data: Record<string, ItickTickItem> | null;
};

type ItickRow = {
  symbol: string;
  price: number;
  latestTradingDay: string;
  source: string;
  market: string;
  name: string | null;
  sector: string | null;
  logo: string | null;
  logoFallback: string | null;
  volume: number | null;
  turnover: number | null;
  ts: number | null;
};

type ItickMarketCacheEntry = {
  last_update: number;
  scope: string;
  market: string;
  exchange: string;
  region: string;
  limit: number;
  data: ItickRow[];
  no_market_data?: boolean;
  message?: string;
  preferred_symbol?: string;
};

type SymbolMetaMap = Record<
  string,
  Record<
    string,
    Record<
      string,
      {
        name?: string | null;
        sector?: string | null;
        logo?: string | null;
      }
    >
  >
>;
type NavigationData = {
  marketAliases?: Record<string, string>;
};

const symbolMeta = symbolMetaJson as SymbolMetaMap;
const navigation = marketNavigation as NavigationData;
const marketAliases = navigation.marketAliases ?? {};
const reverseMarketAliases = Object.entries(marketAliases).reduce<
  Record<string, string[]>
>((acc, [alias, canonical]) => {
  if (!acc[canonical]) {
    acc[canonical] = [];
  }

  acc[canonical].push(alias);
  return acc;
}, {});
const memoryItickCache =
  ((globalThis as any).__itick_markets_cache as Map<string, ItickMarketCacheEntry> | undefined) ??
  new Map<string, ItickMarketCacheEntry>();

(globalThis as any).__itick_markets_cache = memoryItickCache;
let redisClient: Redis | null = null;

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function toIsoDate(timestamp?: number) {
  if (!timestamp) return "";
  return new Date(timestamp).toISOString();
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function getItickCacheKey(params: {
  scope: string;
  market: string;
  exchange: string;
  limit: number;
  preferredSymbol: string | null;
}) {
  const { scope, market, exchange, limit, preferredSymbol } = params;
  const symbolKey = preferredSymbol ? preferredSymbol.toUpperCase() : "-";
  return `itick:markets:v1:${scope}:${market}:${exchange}:limit:${limit}:symbol:${symbolKey}`;
}

function isValidCacheEntry(value: unknown): value is ItickMarketCacheEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ItickMarketCacheEntry>;
  return (
    typeof v.last_update === "number" &&
    typeof v.scope === "string" &&
    typeof v.market === "string" &&
    typeof v.exchange === "string" &&
    typeof v.region === "string" &&
    typeof v.limit === "number" &&
    Array.isArray(v.data)
  );
}

async function getItickCache(key: string): Promise<ItickMarketCacheEntry | null> {
  // L1: local process memory (fast path)
  const local = memoryItickCache.get(key);
  if (local) {
    if (Date.now() - local.last_update > ITICK_CACHE_TTL_SEC * 1000) {
      memoryItickCache.delete(key);
    } else {
      return local;
    }
  }

  // L2: Redis (shared cache across instances)
  if (redisClient) {
    try {
      const raw = await redisClient.get<ItickMarketCacheEntry | string>(key);
      if (!raw) return null;
      const parsed =
        typeof raw === "string" ? (JSON.parse(raw) as unknown) : (raw as unknown);
      if (isValidCacheEntry(parsed)) {
        memoryItickCache.set(key, parsed);
        return parsed;
      }
      await redisClient.del(key).catch(() => {});
      return null;
    } catch {}
  }
  return null;
}

async function setItickCache(key: string, value: ItickMarketCacheEntry) {
  // Keep local cache hot even when Redis is enabled.
  memoryItickCache.set(key, value);

  if (redisClient) {
    redisClient
      .set(key, JSON.stringify(value), {
        ex: ITICK_CACHE_TTL_SEC,
      })
      .catch(() => {});
  }
}

async function clearItickCache(key: string) {
  memoryItickCache.delete(key);

  if (redisClient) {
    redisClient.del(key).catch(() => {});
  }
}

function normalizeLogoFallback(symbol: string) {
  const s = symbol.toLowerCase();

  if (s.endsWith("usdt")) return s.replace("usdt", "");
  if (/^[a-z]{6}$/i.test(symbol)) return s.slice(0, 3);

  return s;
}

function getMarketCandidates(market: string): string[] {
  const candidates = new Set<string>([market]);
  const canonical = marketAliases[market];

  if (canonical) {
    candidates.add(canonical);
  }

  const aliases = reverseMarketAliases[market] ?? [];
  for (const alias of aliases) {
    candidates.add(alias);
  }

  return Array.from(candidates);
}

function marketsMatch(a: string, b: string) {
  if (a === b) return true;
  const aCandidates = new Set(getMarketCandidates(a));
  const bCandidates = getMarketCandidates(b);

  for (const candidate of bCandidates) {
    if (aCandidates.has(candidate)) return true;
  }

  return false;
}

function getSymbolMeta(market: string, exchange: string, symbol: string) {
  for (const marketKey of getMarketCandidates(market)) {
    const meta = symbolMeta?.[marketKey]?.[exchange]?.[symbol];
    if (!meta) continue;

    return {
      name: meta.name ?? null,
      sector: meta.sector ?? null,
      logo: meta.logo ?? null,
    };
  }

  return {
    name: null,
    sector: null,
    logo: null,
  };
}

function normalizeRows(
  data: Record<string, ItickTickItem>,
  market: string,
  exchange: string
): ItickRow[] {
  return Object.values(data).map((item) => {
    const symbol = item.s;
    const meta = getSymbolMeta(market, exchange, symbol);

    return {
      symbol,
      price: item.ld ?? 0,
      latestTradingDay: toIsoDate(item.t),
      source: exchange,
      market,
      name: meta.name,
      sector: meta.sector,
      logo: meta.logo, // si viene null o vacío, el frontend hace fallback local
      logoFallback: !meta.logo ? normalizeLogoFallback(symbol) : null,
      volume: item.v ?? null,
      turnover: item.tu ?? null,
      ts: item.ts ?? null,
    };
  });
}

function isSuccessfulItickData(
  attempt: Pick<Awaited<ReturnType<typeof fetchItickBatch>>, "ok" | "json">
) {
  return (
    attempt.ok &&
    attempt.json?.code === 0 &&
    attempt.json?.data &&
    typeof attempt.json.data === "object"
  );
}

function isEmptySuccessfulResponse(
  attempt: Pick<
    Awaited<ReturnType<typeof fetchItickBatch>>,
    "ok" | "json"
  >
) {
  if (!isSuccessfulItickData(attempt)) return false;
  return Object.keys(attempt.json!.data ?? {}).length === 0;
}

function isRateLimitResponse(attempt: {
  status: number;
  rawText: string;
  json: ItickResponse | null;
}) {
  if (attempt.status === 429) return true;

  const message = (attempt.json?.msg ?? "").toLowerCase();
  const raw = (attempt.rawText ?? "").toLowerCase();
  const rawError = (
    (attempt.json as unknown as { error_msg?: string } | null)?.error_msg ?? ""
  ).toLowerCase();

  return (
    message.includes("request limit exceeded") ||
    message.includes("request is too much") ||
    raw.includes("request limit exceeded") ||
    raw.includes("request is too much") ||
    rawError.includes("request limit exceeded") ||
    rawError.includes("request is too much") ||
    rawError.includes("\"code\":429")
  );
}

function isPackageRestrictionResponse(attempt: {
  rawText: string;
  json: ItickResponse | null;
}) {
  const message = (attempt.json?.msg ?? "").toLowerCase();
  const raw = (attempt.rawText ?? "").toLowerCase();
  const rawError = (
    (attempt.json as unknown as { error_msg?: string } | null)?.error_msg ?? ""
  ).toLowerCase();

  return (
    message.includes("only supports subscribing to") ||
    raw.includes("only supports subscribing to") ||
    rawError.includes("only supports subscribing to")
  );
}

async function fetchItickBatch(params: {
  baseUrl: string;
  apiType: string;
  region: string;
  symbols: string[];
  token: string;
}) {
  const { baseUrl, apiType, region, symbols, token } = params;

  const codes = symbols.join(",");
  const url = `${baseUrl}/${apiType}/ticks?region=${region}&codes=${encodeURIComponent(codes)}`;

  console.log("[iTICK markets] Request URL:", url);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      token,
    },
    cache: "no-store",
  });

  const rawText = await res.text();

  console.log("[iTICK markets] Response status:", res.status);
  console.log("[iTICK markets] Raw response:", rawText);

  let json: ItickResponse | null = null;

  try {
    json = JSON.parse(rawText) as ItickResponse;
  } catch {
    json = null;
  }

  return {
    ok: res.ok,
    status: res.status,
    rawText,
    json,
    url,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const scope = (searchParams.get("scope") ?? "US").toUpperCase();
    const market = searchParams.get("market");
    const exchange = searchParams.get("exchange");
    const limitParam = searchParams.get("limit");
    const preferredSymbolParam = searchParams.get("symbol");
    const preferredSymbol = preferredSymbolParam?.trim().toUpperCase() ?? null;

    const requestedLimit = Number(limitParam ?? String(DEFAULT_LIMIT));
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? requestedLimit
        : DEFAULT_LIMIT;

    if (!market || !exchange) {
      return NextResponse.json(
        { error: "Parámetros requeridos: market y exchange" },
        { status: 400 }
      );
    }

    const requestConfig = getRequestConfig(market, exchange);

    if (!requestConfig) {
      return NextResponse.json(
        { error: `No existe configuración para ${market}/${exchange}` },
        { status: 400 }
      );
    }

    const { region, apiType, meta } = requestConfig;

    const scopeMatches = meta.scope === scope || meta.region === scope;

    if (!scopeMatches) {
      return NextResponse.json(
        {
          error: `El exchange ${exchange} no coincide con scope/región ${scope}`,
          detail: {
            exchangeScope: meta.scope,
            exchangeRegion: meta.region,
            receivedScope: scope,
          },
        },
        { status: 400 }
      );
    }

    if (!marketsMatch(meta.market, market)) {
      return NextResponse.json(
        {
          error: `El exchange ${exchange} no pertenece al mercado ${market}`,
          detail: { exchangeMarket: meta.market, receivedMarket: market },
        },
        { status: 400 }
      );
    }

    const cacheKey = getItickCacheKey({
      scope,
      market,
      exchange,
      limit,
      preferredSymbol,
    });

    const cached = await getItickCache(cacheKey);
    if (cached) {
      const cacheAgeMs = Date.now() - cached.last_update;

      if (cacheAgeMs <= ITICK_CACHE_WINDOW_MS) {
        if (cached.no_market_data) {
          return NextResponse.json(
            {
              no_market_data: true,
              message: cached.message ?? NO_MARKET_DATA_MESSAGE,
              last_update: cached.last_update,
              data: [],
            },
            {
              status: 200,
              headers: {
                "X-Cache": "HIT",
                "X-Cache-Age-Ms": String(cacheAgeMs),
                "X-Last-Update": new Date(cached.last_update).toISOString(),
                "X-Market-Data-Empty": "true",
              },
            }
          );
        }

        return NextResponse.json(cached.data, {
          status: 200,
          headers: {
            "X-Cache": "HIT",
            "X-Cache-Age-Ms": String(cacheAgeMs),
            "X-Last-Update": new Date(cached.last_update).toISOString(),
          },
        });
      }

      await clearItickCache(cacheKey);
    }

    const baseUrl = process.env.ITICK_API_URL;
    const token = process.env.ITICK_API_KEY;

    if (!baseUrl || !token) {
      return NextResponse.json(
        { error: "Faltan variables ITICK_API_URL o ITICK_API_KEY" },
        { status: 500 }
      );
    }

    const symbols = getSymbolsForSelection(market, exchange, limit, preferredSymbol);
    const keyTier = (
      process.env.ITICK_KEY_TIER ??
      (process.env.NODE_ENV === "production" ? "paid" : "free")
    ).toLowerCase();
    const defaultFirstAttemptSize =
      keyTier === "paid"
        ? symbols.length
        : Math.min(FALLBACK_CHUNK_SIZE, symbols.length);
    const parsedFirstAttemptSize = Number(
      process.env.ITICK_FIRST_ATTEMPT_BATCH_SIZE ?? String(defaultFirstAttemptSize)
    );
    const firstAttemptBatchSize =
      Number.isFinite(parsedFirstAttemptSize) && parsedFirstAttemptSize > 0
        ? Math.min(Math.floor(parsedFirstAttemptSize), symbols.length)
        : defaultFirstAttemptSize;
    const firstAttemptSymbols = symbols.slice(0, firstAttemptBatchSize);
    const fallbackEnabled = process.env.ITICK_ENABLE_FALLBACK
      ? process.env.ITICK_ENABLE_FALLBACK.toLowerCase() === "true"
      : keyTier === "paid";

    if (!symbols.length) {
      return NextResponse.json(
        {
          error: `No hay símbolos para ${market}/${exchange}`,
          detail: { scope, market, exchange },
        },
        { status: 404 }
      );
    }

    const respondWithRows = async (rows: ItickRow[]) => {
      const lastUpdate = Date.now();

      await setItickCache(cacheKey, {
        last_update: lastUpdate,
        scope,
        market,
        exchange,
        region,
        limit,
        data: rows,
        ...(preferredSymbol ? { preferred_symbol: preferredSymbol } : {}),
      });

      return NextResponse.json(rows, {
        status: 200,
        headers: {
          "X-Cache": "MISS",
          "X-Cache-Age-Ms": "0",
          "X-Last-Update": new Date(lastUpdate).toISOString(),
        },
      });
    };

    const respondWithNoMarketData = async (detail: Record<string, unknown>) => {
      const lastUpdate = Date.now();

      await setItickCache(cacheKey, {
        last_update: lastUpdate,
        scope,
        market,
        exchange,
        region,
        limit,
        data: [],
        no_market_data: true,
        message: NO_MARKET_DATA_MESSAGE,
        ...(preferredSymbol ? { preferred_symbol: preferredSymbol } : {}),
      });

      return NextResponse.json(
        {
          no_market_data: true,
          message: NO_MARKET_DATA_MESSAGE,
          last_update: lastUpdate,
          data: [],
          detail,
        },
        {
          status: 200,
          headers: {
            "X-Cache": "MISS",
            "X-Cache-Age-Ms": "0",
            "X-Last-Update": new Date(lastUpdate).toISOString(),
            "X-Market-Data-Empty": "true",
          },
        }
      );
    };

    const firstAttempt = await fetchItickBatch({
      baseUrl,
      apiType,
      region,
      symbols: firstAttemptSymbols,
      token,
    });

    const mergedData: Record<string, ItickTickItem> = {};
    const errors: Array<{
      chunk: string[];
      status: number;
      rawText: string;
      json: ItickResponse | null;
    }> = [];
    const attemptedSymbols = new Set<string>(firstAttemptSymbols);

    if (isSuccessfulItickData(firstAttempt)) {
      Object.assign(mergedData, firstAttempt.json!.data);
    } else {
      errors.push({
        chunk: firstAttemptSymbols,
        status: firstAttempt.status,
        rawText: firstAttempt.rawText,
        json: firstAttempt.json,
      });
    }

    let missingSymbols = symbols.filter((symbol) => !mergedData[symbol]);

    const emptyScanEnabled = process.env.ITICK_EMPTY_SCAN_ENABLED
      ? process.env.ITICK_EMPTY_SCAN_ENABLED.toLowerCase() === "true"
      : true;

    if (isPackageRestrictionResponse(firstAttempt)) {
      return NextResponse.json(
        {
          error: "Tu paquete iTICK no soporta esta región/mercado",
          detail: {
            status: firstAttempt.status,
            rawText: firstAttempt.rawText,
            json: firstAttempt.json,
          },
        },
        { status: 403 }
      );
    }

    if (isRateLimitResponse(firstAttempt)) {
      return NextResponse.json(
        {
          error: "Límite de solicitudes de iTICK alcanzado",
          detail: {
            status: firstAttempt.status,
            rawText: firstAttempt.rawText,
            json: firstAttempt.json,
          },
        },
        { status: 429 }
      );
    }

    if (
      emptyScanEnabled &&
      isEmptySuccessfulResponse(firstAttempt) &&
      missingSymbols.length
    ) {
      const firstAttemptSet = new Set(firstAttemptSymbols);
      const scanCandidates = symbols.filter((symbol) => !firstAttemptSet.has(symbol));
      const scanChunks = chunkArray(scanCandidates, FALLBACK_CHUNK_SIZE);

      console.log("[iTICK markets] Empty first response, scanning 3-by-3:", scanCandidates);

      for (const chunk of scanChunks) {
        chunk.forEach((symbol) => attemptedSymbols.add(symbol));

        const chunkAttempt = await fetchItickBatch({
          baseUrl,
          apiType,
          region,
          symbols: chunk,
          token,
        });

        const chunkJson = chunkAttempt.json;

        if (isSuccessfulItickData(chunkAttempt)) {
          Object.assign(mergedData, chunkJson!.data);

          if (Object.keys(mergedData).length > 0) {
            console.log("[iTICK markets] Data found while scanning chunks:", Object.keys(mergedData));
            break;
          }

          continue;
        }

        errors.push({
          chunk,
          status: chunkAttempt.status,
          rawText: chunkAttempt.rawText,
          json: chunkJson,
        });

        if (isPackageRestrictionResponse(chunkAttempt) || isRateLimitResponse(chunkAttempt)) {
          break;
        }
      }

      missingSymbols = symbols.filter((symbol) => !mergedData[symbol]);
    }

    if (!missingSymbols.length) {
      return await respondWithRows(normalizeRows(mergedData, market, exchange));
    }

    if (!fallbackEnabled) {
      console.log("[iTICK markets] Fallback disabled for current environment.");
      const firstRows = normalizeRows(mergedData, market, exchange);

      if (firstRows.length) {
        return await respondWithRows(firstRows);
      }

      if (isEmptySuccessfulResponse(firstAttempt)) {
        return await respondWithNoMarketData({
          scope,
          market,
          exchange,
          region,
          apiType,
          symbolsTried: Array.from(attemptedSymbols),
          firstAttempt: {
            status: firstAttempt.status,
            rawText: firstAttempt.rawText,
            json: firstAttempt.json,
          },
        });
      }

      if (isPackageRestrictionResponse(firstAttempt)) {
        return NextResponse.json(
          {
            error: "Tu paquete iTICK no soporta esta región/mercado",
            detail: {
              status: firstAttempt.status,
              rawText: firstAttempt.rawText,
              json: firstAttempt.json,
            },
          },
          { status: 403 }
        );
      }

      if (isRateLimitResponse(firstAttempt)) {
        return NextResponse.json(
          {
            error: "Límite de solicitudes de iTICK alcanzado",
            detail: {
              status: firstAttempt.status,
              rawText: firstAttempt.rawText,
              json: firstAttempt.json,
            },
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "ITICK no devolvió datos en el primer intento",
          detail: {
            fallbackEnabled: false,
            firstAttempt: {
              status: firstAttempt.status,
              rawText: firstAttempt.rawText,
              json: firstAttempt.json,
            },
          },
        },
        { status: 502 }
      );
    }

    console.log("[iTICK markets] Missing symbols after first attempt:", missingSymbols);

    const chunks = chunkArray(missingSymbols, FALLBACK_CHUNK_SIZE);

    for (const chunk of chunks) {
      chunk.forEach((symbol) => attemptedSymbols.add(symbol));

      const chunkAttempt = await fetchItickBatch({
        baseUrl,
        apiType,
        region,
        symbols: chunk,
        token,
      });

      const chunkJson = chunkAttempt.json;

      if (isSuccessfulItickData(chunkAttempt)) {
        Object.assign(mergedData, chunkJson!.data);
      } else {
        errors.push({
          chunk,
          status: chunkAttempt.status,
          rawText: chunkAttempt.rawText,
          json: chunkJson,
        });
      }
    }

    const stillMissingSymbols = symbols.filter((symbol) => !mergedData[symbol]);

    if (stillMissingSymbols.length) {
      console.log("[iTICK markets] Symbols still missing after chunk fallback:", stillMissingSymbols);
    }

    for (const symbol of stillMissingSymbols) {
      attemptedSymbols.add(symbol);

      const singleAttempt = await fetchItickBatch({
        baseUrl,
        apiType,
        region,
        symbols: [symbol],
        token,
      });

      const singleJson = singleAttempt.json;

      if (isSuccessfulItickData(singleAttempt)) {
        Object.assign(mergedData, singleJson!.data);
      } else {
        errors.push({
          chunk: [symbol],
          status: singleAttempt.status,
          rawText: singleAttempt.rawText,
          json: singleJson,
        });
      }
    }

    const rows = normalizeRows(mergedData, market, exchange);

    if (!rows.length) {
      const allAttemptsSuccessfulButEmpty =
        isEmptySuccessfulResponse(firstAttempt) && errors.length === 0;

      if (allAttemptsSuccessfulButEmpty) {
        return await respondWithNoMarketData({
          scope,
          market,
          exchange,
          region,
          apiType,
          symbolsTried: Array.from(attemptedSymbols),
          firstAttempt: {
            status: firstAttempt.status,
            rawText: firstAttempt.rawText,
            json: firstAttempt.json,
          },
        });
      }

      const packageRestricted =
        isPackageRestrictionResponse(firstAttempt) ||
        errors.some((attempt) =>
          isPackageRestrictionResponse({
            rawText: attempt.rawText,
            json: attempt.json,
          })
        );
      const rateLimited =
        isRateLimitResponse(firstAttempt) ||
        errors.some((attempt) =>
          isRateLimitResponse({
            status: attempt.status,
            rawText: attempt.rawText,
            json: attempt.json,
          })
        );

      return NextResponse.json(
        {
          error: packageRestricted
            ? "Tu paquete iTICK no soporta esta región/mercado"
            : rateLimited
              ? "Límite de solicitudes de iTICK alcanzado"
              : "ITICK no devolvió datos ni en lote ni en bloques",
          detail: {
            packageRestricted,
            rateLimited,
            firstAttempt: {
              status: firstAttempt.status,
              rawText: firstAttempt.rawText,
              json: firstAttempt.json,
            },
            chunkErrors: errors,
          },
        },
        { status: packageRestricted ? 403 : rateLimited ? 429 : 502 }
      );
    }

    return await respondWithRows(rows);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error interno preparando consulta a ITICK",
        detail: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}
