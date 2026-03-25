import { NextResponse } from "next/server";
import symbolMetaJson from "@/data/itick/itick_symbol_meta.json";
import exchangeMetaJson from "@/data/itick/exchange-meta.json";
import { ITICK_DEFAULT_FAVORITE_SYMBOLS } from "@/lib/itick/favorites";

type FavoriteConfig = {
  symbol: string;
  market: string;
  exchange: string;
};

type FavoriteContextInput = {
  market?: string | null;
  exchange?: string | null;
  scope?: string | null;
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

const exchangeMeta = exchangeMetaJson as ExchangeMeta;
const symbolMeta = symbolMetaJson as SymbolMetaMap;
const ITICK_API_URL = process.env.ITICK_API_URL ?? "https://api.itick.org";
const ITICK_API_KEY = process.env.ITICK_API_KEY ?? "";

const FAVORITE_SOURCE_MAP: Record<string, FavoriteConfig> = {
  EURUSD: { symbol: "EURUSD", market: "forex", exchange: "GB" },
  USDJPY: { symbol: "USDJPY", market: "forex", exchange: "GB" },
  USDCNY: { symbol: "USDCNY", market: "forex", exchange: "GB" },
  GBPUSD: { symbol: "GBPUSD", market: "forex", exchange: "GB" },
  USDCAD: { symbol: "USDCAD", market: "forex", exchange: "GB" },
  BTCUSDT: { symbol: "BTCUSDT", market: "crypto", exchange: "BA" },
  ETHUSDT: { symbol: "ETHUSDT", market: "crypto", exchange: "BA" },
  SOLUSDT: { symbol: "SOLUSDT", market: "crypto", exchange: "BA" },
  XRPUSDT: { symbol: "XRPUSDT", market: "crypto", exchange: "BA" },
  BNBUSDT: { symbol: "BNBUSDT", market: "crypto", exchange: "BA" },
};

function normalizeRequestedMarket(market: string | null | undefined) {
  const m = String(market ?? "").trim().toLowerCase();
  if (!m) return "";
  if (m === "fx") return "forex";
  if (m === "stock") return "acciones";
  if (m === "future") return "commodities";
  if (m === "fund") return "funds";
  if (m === "all") return "funds";
  return m;
}

function inferMarketFromSymbol(symbol: string) {
  const s = symbol.toUpperCase();
  if (s.endsWith("USDT")) return "crypto";
  if (/^[A-Z]{6}$/.test(s)) return "forex";
  return "acciones";
}

function defaultExchangeByMarket(market: string) {
  switch (market) {
    case "crypto":
      return "BA";
    case "forex":
      return "GB";
    case "commodities":
      return "CME";
    case "indices":
      return "US";
    default:
      return "";
  }
}

function parseContextMap(raw: string | null) {
  if (!raw) return {} as Record<string, FavoriteContextInput>;

  try {
    const parsed = JSON.parse(raw) as Record<string, FavoriteContextInput>;
    if (!parsed || typeof parsed !== "object") return {};

    const out: Record<string, FavoriteContextInput> = {};
    for (const [symbol, context] of Object.entries(parsed)) {
      const key = symbol.trim().toUpperCase();
      if (!key || !context || typeof context !== "object") continue;
      out[key] = context;
    }
    return out;
  } catch {
    return {};
  }
}

function buildDescriptor(
  symbol: string,
  contextMap: Record<string, FavoriteContextInput>
): FavoriteConfig | null {
  const key = symbol.trim().toUpperCase();
  if (!key) return null;

  const predefined = FAVORITE_SOURCE_MAP[key];
  const context = contextMap[key];

  const market = normalizeRequestedMarket(context?.market) ||
    predefined?.market ||
    inferMarketFromSymbol(key);

  const exchange = String(context?.exchange ?? predefined?.exchange ?? "")
    .trim()
    .toUpperCase() || defaultExchangeByMarket(market);

  if (!exchange) return null;

  return {
    symbol: key,
    market,
    exchange,
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function normalizeLogoFallback(symbol: string) {
  const s = symbol.toLowerCase();
  if (s.endsWith("usdt")) return s.replace("usdt", "");
  if (/^[a-z]{6}$/i.test(symbol)) return s.slice(0, 3);
  return s;
}

function buildGroupKey(apiType: string, region: string, exchange: string, market: string) {
  return `${apiType}|${region}|${exchange}|${market}`;
}

function toIsoDate(timestamp?: number) {
  if (!timestamp) return "";
  return new Date(timestamp).toISOString();
}

function resolveMeta(market: string, exchange: string, symbol: string) {
  const marketMeta = symbolMeta?.[market];
  if (!marketMeta) {
    return {
      name: null,
      sector: null,
      logo: null,
    };
  }

  const exchangeInfo = exchangeMeta?.[exchange];
  const exchangeCandidates = [
    exchange,
    exchangeInfo?.label ?? "",
    exchange === "BA" ? "Binance" : "",
    exchange === "BT" ? "Bitget" : "",
    exchange === "PB" ? "ProBit" : "",
    exchange === "GB" ? "FXCM" : "",
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  let meta:
    | {
        name?: string | null;
        sector?: string | null;
        logo?: string | null;
      }
    | undefined;

  for (const candidate of exchangeCandidates) {
    if (marketMeta?.[candidate]?.[symbol]) {
      meta = marketMeta[candidate][symbol];
      break;
    }
  }

  return {
    name: meta?.name ?? null,
    sector: meta?.sector ?? null,
    logo: meta?.logo ?? null,
  };
}

async function fetchBatch(params: {
  apiType: string;
  region: string;
  symbols: string[];
}) {
  const { apiType, region, symbols } = params;
  const codes = symbols.join(",");
  const url = `${ITICK_API_URL}/${apiType}/ticks?region=${encodeURIComponent(
    region
  )}&codes=${encodeURIComponent(codes)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      token: ITICK_API_KEY,
    },
    cache: "no-store",
  });

  const rawText = await res.text();
  let json: ItickResponse | null = null;
  try {
    json = JSON.parse(rawText) as ItickResponse;
  } catch {
    json = null;
  }

  return {
    status: res.status,
    ok: res.ok,
    json,
    rawText,
  };
}

export async function GET(req: Request) {
  if (!ITICK_API_KEY) {
    return NextResponse.json(
      { error: "ITICK_API_KEY no configurada" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get("limit") ?? "10");
  const chunkParam = Number(searchParams.get("chunk") ?? "3");
  const symbolsParam = (searchParams.get("symbols") ?? "").trim();
  const contextsParam = (searchParams.get("contexts") ?? "").trim();

  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), 20)
      : 10;

  const chunkSize =
    Number.isFinite(chunkParam) && chunkParam > 0
      ? Math.min(Math.floor(chunkParam), 10)
      : 3;

  const requestedSymbols = symbolsParam
    ? symbolsParam
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    : [...ITICK_DEFAULT_FAVORITE_SYMBOLS];

  const contextMap = parseContextMap(contextsParam);

  const descriptors = requestedSymbols
    .slice(0, limit)
    .map((symbol) => buildDescriptor(symbol, contextMap))
    .filter((item): item is FavoriteConfig => Boolean(item));

  if (!descriptors.length) {
    return NextResponse.json([], { status: 200 });
  }

  const grouped = new Map<string, FavoriteConfig[]>();
  for (const descriptor of descriptors) {
    const exchangeInfo = exchangeMeta?.[descriptor.exchange];
    if (!exchangeInfo?.region || !exchangeInfo?.apiType) continue;

    const key = buildGroupKey(
      exchangeInfo.apiType,
      exchangeInfo.region.toUpperCase(),
      descriptor.exchange,
      descriptor.market
    );

    const list = grouped.get(key) ?? [];
    list.push(descriptor);
    grouped.set(key, list);
  }

  const merged = new Map<string, ItickTickItem>();
  let packageUnavailable = false;
  let rateLimited = false;

  for (const [groupKey, list] of grouped.entries()) {
    const [apiType, region] = groupKey.split("|");
    const chunks = chunkArray(
      list.map((item) => item.symbol),
      chunkSize
    );

    for (const chunk of chunks) {
      const attempt = await fetchBatch({
        apiType,
        region,
        symbols: chunk,
      });

      const message = (attempt.json?.msg ?? attempt.rawText ?? "").toLowerCase();
      if (
        attempt.status === 429 ||
        message.includes("request limit exceeded") ||
        message.includes("\"code\":429")
      ) {
        rateLimited = true;
        continue;
      }

      if (message.includes("only supports subscribing to")) {
        packageUnavailable = true;
        continue;
      }

      if (!attempt.ok || attempt.json?.code !== 0 || !attempt.json?.data) {
        continue;
      }

      Object.entries(attempt.json.data).forEach(([symbol, item]) => {
        merged.set(symbol.toUpperCase(), item);
      });
    }
  }

  if (!merged.size && rateLimited) {
    return NextResponse.json(
      { error: "Limite de solicitudes de iTICK alcanzado" },
      { status: 429 }
    );
  }

  if (!merged.size && packageUnavailable) {
    return NextResponse.json(
      { error: "Mercado no disponible por plan de suscripcion iTICK" },
      { status: 403 }
    );
  }

  const rows = descriptors
    .map((descriptor) => {
      const item = merged.get(descriptor.symbol.toUpperCase());
      if (!item) return null;

      const meta = resolveMeta(
        descriptor.market,
        descriptor.exchange,
        descriptor.symbol
      );

      return {
        symbol: descriptor.symbol,
        price: item.ld ?? 0,
        latestTradingDay: toIsoDate(item.t),
        source: descriptor.exchange,
        market: descriptor.market,
        name: meta.name,
        sector: meta.sector,
        logo: meta.logo,
        logoFallback: !meta.logo
          ? normalizeLogoFallback(descriptor.symbol)
          : null,
        volume: item.v ?? null,
        turnover: item.tu ?? null,
        ts: item.ts ?? null,
        isFavorite: true,
      };
    })
    .filter(Boolean);

  return NextResponse.json(rows, { status: 200 });
}
