import exchangeMetaJson from "@/data/itick/exchange-meta.json";
import marketNavigationJson from "@/data/itick/market-navigation.json";
import marketStructureJson from "@/data/itick/itick_market_structure.json";

type ExchangeMeta = Record<
  string,
  {
    scope?: string;
    region?: string;
    market?: string;
    apiType?: string;
  }
>;

type MarketStructure = Record<string, Record<string, string[]>>;
type NavigationData = {
  marketAliases?: Record<string, string>;
};

type ItickTickItem = {
  s: string;
  ld?: number;
  t?: number;
  v?: number;
  tu?: number;
  ts?: number;
};

type ItickTicksResponse = {
  code: number;
  msg: string | null;
  data: Record<string, ItickTickItem> | null;
};

type QuoteCacheEntry = {
  updatedAt: number;
  value: ItickLatestQuote;
};

type SymbolContext = {
  market: string;
  exchange: string;
};

export type ItickQuoteContext = {
  market?: string | null;
  exchange?: string | null;
  scope?: string | null;
};

export type ItickLatestQuote = {
  symbol: string;
  price: number;
  timestampMs: number | null;
  latestTradingDay: string;
  volume: number | null;
  turnover: number | null;
  ts: number | null;
  market: string;
  exchange: string;
  region: string;
  apiType: string;
};

export type ItickQuoteErrorCode =
  | "misconfigured"
  | "rate_limited"
  | "package_unavailable"
  | "not_found"
  | "upstream_error";

export class ItickQuoteError extends Error {
  code: ItickQuoteErrorCode;
  status: number;
  detail?: unknown;

  constructor(
    message: string,
    code: ItickQuoteErrorCode,
    status: number,
    detail?: unknown
  ) {
    super(message);
    this.name = "ItickQuoteError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

const exchangeMeta = exchangeMetaJson as ExchangeMeta;
const marketStructure = marketStructureJson as MarketStructure;
const navigation = marketNavigationJson as NavigationData;
const marketAliases = navigation.marketAliases ?? {};

const DEFAULT_EXCHANGE_BY_MARKET: Record<string, string> = {
  crypto: "BA",
  forex: "GB",
  indices: "GB",
  commodities: "CME",
  acciones: "NASDAQ",
  funds: "AMEX",
};

const PREFERRED_SYMBOL_CONTEXTS: Record<string, SymbolContext> = {
  BTCUSDT: { market: "crypto", exchange: "BA" },
  ETHUSDT: { market: "crypto", exchange: "BA" },
  SOLUSDT: { market: "crypto", exchange: "BA" },
  XRPUSDT: { market: "crypto", exchange: "BA" },
  BNBUSDT: { market: "crypto", exchange: "BA" },
  EURUSD: { market: "forex", exchange: "GB" },
  USDJPY: { market: "forex", exchange: "GB" },
  USDCNY: { market: "forex", exchange: "GB" },
  GBPUSD: { market: "forex", exchange: "GB" },
  USDCAD: { market: "forex", exchange: "GB" },
  XAUUSD: { market: "forex", exchange: "GB" },
};

const ITICK_QUOTE_CACHE_MS = Number(process.env.ITICK_QUOTE_CACHE_MS ?? 6000);
const quoteCache: Map<string, QuoteCacheEntry> =
  ((globalThis as { __itick_quote_cache?: Map<string, QuoteCacheEntry> })
    .__itick_quote_cache as Map<string, QuoteCacheEntry> | undefined) ??
  new Map<string, QuoteCacheEntry>();

(
  globalThis as {
    __itick_quote_cache?: Map<string, QuoteCacheEntry>;
  }
).__itick_quote_cache = quoteCache;

const symbolContextIndex = buildSymbolContextIndex();

function normalizeSymbolCode(symbol: string) {
  if (/^\d+\.0+$/.test(symbol)) {
    return symbol.replace(/\.0+$/, "");
  }
  return symbol;
}

function normalizeSymbol(symbol: string | null | undefined) {
  return normalizeSymbolCode(String(symbol ?? "").trim().toUpperCase());
}

function normalizeMarket(market: string | null | undefined): string {
  const value = String(market ?? "").trim().toLowerCase();
  if (!value) return "";
  if (value === "fx") return "forex";
  if (value === "stock") return "acciones";
  if (value === "future") return "commodities";
  if (value === "fund") return "funds";
  if (value === "all") return "funds";
  const aliased = marketAliases[value];
  if (aliased && aliased !== value) {
    return normalizeMarket(aliased);
  }
  return value;
}

function inferMarketFromSymbol(symbol: string): string {
  const upper = normalizeSymbol(symbol);
  if (upper.endsWith("USDT")) return "crypto";
  if (/^[A-Z]{6}$/.test(upper)) return "forex";
  return "acciones";
}

function getExchangeInfo(exchange: string) {
  const key = String(exchange ?? "").trim().toUpperCase();
  if (!key) return null;
  const info = exchangeMeta[key];
  if (!info?.apiType || !info?.region) return null;
  return {
    exchange: key,
    market: normalizeMarket(info.market),
    apiType: info.apiType,
    region: info.region.toUpperCase(),
    scope: String(info.scope ?? "").toUpperCase(),
  };
}

function buildSymbolContextIndex() {
  const index = new Map<string, SymbolContext[]>();

  for (const [rawMarket, exchanges] of Object.entries(marketStructure)) {
    const market = normalizeMarket(rawMarket);
    if (!market) continue;

    for (const [exchange, symbols] of Object.entries(exchanges)) {
      const exchangeInfo = getExchangeInfo(exchange);
      if (!exchangeInfo) continue;

      for (const rawSymbol of symbols) {
        const symbol = normalizeSymbol(rawSymbol);
        if (!symbol) continue;

        const list = index.get(symbol) ?? [];
        if (!list.some((item) => item.market === market && item.exchange === exchangeInfo.exchange)) {
          list.push({
            market,
            exchange: exchangeInfo.exchange,
          });
        }
        index.set(symbol, list);
      }
    }
  }

  return index;
}

function dedupeContexts(items: SymbolContext[]) {
  const seen = new Set<string>();
  const out: SymbolContext[] = [];

  for (const item of items) {
    const market = normalizeMarket(item.market);
    const exchange = String(item.exchange ?? "").trim().toUpperCase();
    if (!market || !exchange) continue;
    if (!getExchangeInfo(exchange)) continue;

    const key = `${market}|${exchange}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ market, exchange });
  }

  return out;
}

function buildCacheKey(symbol: string, context: ItickQuoteContext | undefined) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const market = normalizeMarket(context?.market ?? "");
  const exchange = String(context?.exchange ?? "").trim().toUpperCase();
  const scope = String(context?.scope ?? "").trim().toUpperCase();
  return `${normalizedSymbol}|${market || "-"}|${exchange || "-"}|${scope || "-"}`;
}

function buildCandidates(symbol: string, context?: ItickQuoteContext): SymbolContext[] {
  const normalizedSymbol = normalizeSymbol(symbol);
  const preferredMarket = normalizeMarket(context?.market ?? "");
  const preferredExchange = String(context?.exchange ?? "").trim().toUpperCase();

  const candidates: SymbolContext[] = [];

  if (preferredExchange) {
    const exchangeInfo = getExchangeInfo(preferredExchange);
    if (exchangeInfo) {
      candidates.push({
        market: preferredMarket || exchangeInfo.market || inferMarketFromSymbol(normalizedSymbol),
        exchange: preferredExchange,
      });
    }
  }

  const explicitSymbol = PREFERRED_SYMBOL_CONTEXTS[normalizedSymbol];
  if (explicitSymbol) {
    candidates.push(explicitSymbol);
  }

  const indexed = symbolContextIndex.get(normalizedSymbol) ?? [];
  if (preferredMarket) {
    candidates.push(...indexed.filter((item) => item.market === preferredMarket));
  }
  candidates.push(...indexed);

  const inferredMarket = preferredMarket || inferMarketFromSymbol(normalizedSymbol);
  const fallbackExchange = DEFAULT_EXCHANGE_BY_MARKET[inferredMarket];
  if (fallbackExchange) {
    candidates.push({
      market: inferredMarket,
      exchange: fallbackExchange,
    });
  }

  return dedupeContexts(candidates).slice(0, 8);
}

function isRateLimited(status: number, payload: ItickTicksResponse | null, rawText: string) {
  if (status === 429) return true;
  const msg = String(payload?.msg ?? "").toLowerCase();
  const raw = String(rawText ?? "").toLowerCase();
  return (
    msg.includes("request limit exceeded") ||
    raw.includes("request limit exceeded") ||
    raw.includes("\"code\":429")
  );
}

function isPackageUnavailable(payload: ItickTicksResponse | null, rawText: string) {
  const msg = String(payload?.msg ?? "").toLowerCase();
  const raw = String(rawText ?? "").toLowerCase();
  return (
    msg.includes("only supports subscribing to") ||
    raw.includes("only supports subscribing to")
  );
}

function extractTickItem(
  data: Record<string, ItickTickItem> | null | undefined,
  symbol: string
) {
  if (!data || typeof data !== "object") return null;
  const direct = data[symbol];
  if (direct) return direct;

  const upper = symbol.toUpperCase();
  for (const [key, item] of Object.entries(data)) {
    if (key.toUpperCase() === upper || item?.s?.toUpperCase() === upper) {
      return item;
    }
  }

  return null;
}

async function fetchQuoteByContext(
  params: SymbolContext & {
    symbol: string;
    baseUrl: string;
    token: string;
  }
) {
  const { symbol, market, exchange, baseUrl, token } = params;
  const exchangeInfo = getExchangeInfo(exchange);
  if (!exchangeInfo) {
    throw new ItickQuoteError(
      `Exchange iTICK no configurado: ${exchange}`,
      "upstream_error",
      502
    );
  }

  const url = `${baseUrl}/${exchangeInfo.apiType}/ticks?region=${encodeURIComponent(
    exchangeInfo.region
  )}&codes=${encodeURIComponent(symbol)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      token,
    },
    cache: "no-store",
  });

  const rawText = await res.text();
  let payload: ItickTicksResponse | null = null;
  try {
    payload = JSON.parse(rawText) as ItickTicksResponse;
  } catch {
    payload = null;
  }

  if (isRateLimited(res.status, payload, rawText)) {
    throw new ItickQuoteError(
      "Limite de solicitudes de iTICK alcanzado",
      "rate_limited",
      429,
      { status: res.status, rawText, payload }
    );
  }

  if (isPackageUnavailable(payload, rawText)) {
    throw new ItickQuoteError(
      "Mercado no disponible por plan de suscripcion iTICK",
      "package_unavailable",
      403,
      { status: res.status, rawText, payload }
    );
  }

  if (!(res.ok && payload?.code === 0 && payload.data)) {
    throw new ItickQuoteError("Respuesta invalida de iTICK", "upstream_error", 502, {
      status: res.status,
      rawText,
      payload,
    });
  }

  const tick = extractTickItem(payload.data, symbol);
  if (!tick || !Number.isFinite(Number(tick.ld))) {
    throw new ItickQuoteError("Sin datos para simbolo en este mercado", "not_found", 404, {
      status: res.status,
      rawText,
      payload,
    });
  }

  const timestampMs = tick.t && Number.isFinite(Number(tick.t)) ? Number(tick.t) : null;

  return {
    symbol,
    price: Number(tick.ld),
    timestampMs,
    latestTradingDay: timestampMs ? new Date(timestampMs).toISOString() : "",
    volume: tick.v !== undefined ? Number(tick.v) : null,
    turnover: tick.tu !== undefined ? Number(tick.tu) : null,
    ts: tick.ts !== undefined ? Number(tick.ts) : null,
    market,
    exchange: exchangeInfo.exchange,
    region: exchangeInfo.region,
    apiType: exchangeInfo.apiType,
  } satisfies ItickLatestQuote;
}

function fromCache(cacheKey: string) {
  const cached = quoteCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.updatedAt > ITICK_QUOTE_CACHE_MS) {
    quoteCache.delete(cacheKey);
    return null;
  }
  return cached.value;
}

function saveCache(cacheKey: string, value: ItickLatestQuote) {
  quoteCache.set(cacheKey, {
    updatedAt: Date.now(),
    value,
  });
}

export async function fetchItickLatestQuote(
  symbolInput: string,
  context?: ItickQuoteContext
): Promise<ItickLatestQuote> {
  const symbol = normalizeSymbol(symbolInput);
  if (!symbol) {
    throw new ItickQuoteError("Simbolo invalido", "not_found", 404);
  }

  const baseUrl = process.env.ITICK_API_URL ?? "https://api.itick.org";
  const token = process.env.ITICK_API_KEY ?? "";
  if (!token) {
    throw new ItickQuoteError("ITICK_API_KEY no configurada", "misconfigured", 500);
  }

  const cacheKey = buildCacheKey(symbol, context);
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  const candidates = buildCandidates(symbol, context);
  if (!candidates.length) {
    throw new ItickQuoteError(
      `No se pudo resolver exchange iTICK para ${symbol}`,
      "not_found",
      404
    );
  }

  let sawPackageError = false;
  const upstreamErrors: unknown[] = [];

  for (const candidate of candidates) {
    try {
      const quote = await fetchQuoteByContext({
        symbol,
        market: candidate.market,
        exchange: candidate.exchange,
        baseUrl,
        token,
      });
      saveCache(cacheKey, quote);
      return quote;
    } catch (error) {
      if (error instanceof ItickQuoteError) {
        if (error.code === "rate_limited") {
          throw error;
        }
        if (error.code === "package_unavailable") {
          sawPackageError = true;
          continue;
        }
        if (error.code === "not_found") {
          continue;
        }
      }
      upstreamErrors.push(error);
    }
  }

  if (sawPackageError) {
    throw new ItickQuoteError(
      "Mercado no disponible por plan de suscripcion iTICK",
      "package_unavailable",
      403
    );
  }

  if (upstreamErrors.length) {
    throw new ItickQuoteError(
      "iTICK no devolvio una cotizacion valida",
      "upstream_error",
      502,
      upstreamErrors
    );
  }

  throw new ItickQuoteError(
    `No se encontro cotizacion para ${symbol}`,
    "not_found",
    404
  );
}

