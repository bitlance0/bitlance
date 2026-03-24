// ssrc/lib/itick/itickServerHelpers.ts

import marketStructure from "@/data/itick/itick_market_structure.json";
import exchangeMeta from "@/data/itick/exchange-meta.json";
import marketNavigation from "@/data/itick/market-navigation.json";

type MarketStructure = Record<string, Record<string, string[]>>;

type ExchangeMetaItem = {
  label: string;
  scope: string;
  market: string;
  region: string;
  apiType: string;
};

type ExchangeMetaMap = Record<string, ExchangeMetaItem>;
type NavigationData = {
  marketAliases?: Record<string, string>;
};

const structure = marketStructure as MarketStructure;
const metaMap = exchangeMeta as ExchangeMetaMap;
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
const REQUEST_CONFIG_OVERRIDES: Record<
  string,
  Record<string, Partial<Pick<ExchangeMetaItem, "region" | "apiType">>>
> = {
  acciones: {
    // Euronext metadata is modeled as EU in local structure, but many iTICK plans
    // require using FR region for these symbols.
    EURONEXT: {
      region: "FR",
    },
  },
};
const REQUEST_CONFIG_FALLBACKS: Record<
  string,
  Record<string, Pick<ExchangeMetaItem, "scope" | "market" | "region" | "apiType" | "label">>
> = {
  indices: {
    GB: {
      label: "Global indices",
      scope: "GLOBAL",
      market: "indices",
      region: "GB",
      apiType: "indices",
    },
  },
};

function normalizeSymbolCode(symbol: string) {
  // Some providers export numeric tickers as "1234.0"; iTICK expects "1234".
  if (/^\d+\.0+$/.test(symbol)) {
    return symbol.replace(/\.0+$/, "");
  }

  return symbol;
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
    if (aCandidates.has(candidate)) {
      return true;
    }
  }

  return false;
}

export function getSymbolsForSelection(
  market: string,
  exchange: string,
  limit = 9,
  preferredSymbol?: string | null
): string[] {
  const marketCandidates = getMarketCandidates(market);
  let symbols: string[] | null = null;

  for (const marketKey of marketCandidates) {
    const marketEntry = structure?.[marketKey];
    if (!marketEntry) continue;

    const candidateSymbols = marketEntry?.[exchange];
    if (Array.isArray(candidateSymbols) && candidateSymbols.length > 0) {
      symbols = candidateSymbols;
      break;
    }
  }

  if (!symbols) return [];
  const normalizedPreferred = preferredSymbol?.trim().toUpperCase() ?? null;
  if (!normalizedPreferred) {
    return symbols.slice(0, limit).map((symbol) => normalizeSymbolCode(symbol));
  }

  const preferredIndex = symbols.findIndex(
    (symbol) => symbol.toUpperCase() === normalizedPreferred
  );

  if (preferredIndex < 0) {
    return symbols.slice(0, limit).map((symbol) => normalizeSymbolCode(symbol));
  }

  const ordered = [
    symbols[preferredIndex],
    ...symbols.filter((_, index) => index !== preferredIndex),
  ];

  return ordered.slice(0, limit).map((symbol) => normalizeSymbolCode(symbol));
}

export function getExchangeMeta(exchange: string): ExchangeMetaItem | null {
  return metaMap?.[exchange] ?? null;
}

export function getRequestConfig(market: string, exchange: string) {
  const meta = getExchangeMeta(exchange);
  if (meta && marketsMatch(meta.market, market)) {
    const override =
      REQUEST_CONFIG_OVERRIDES?.[market]?.[exchange] ??
      REQUEST_CONFIG_OVERRIDES?.[meta.market]?.[exchange];

    return {
      region: override?.region ?? meta.region,
      apiType: override?.apiType ?? meta.apiType,
      meta,
    };
  }

  for (const marketCandidate of getMarketCandidates(market)) {
    const fallbackMeta = REQUEST_CONFIG_FALLBACKS?.[marketCandidate]?.[exchange];
    if (!fallbackMeta) continue;

    return {
      region: fallbackMeta.region,
      apiType: fallbackMeta.apiType,
      meta: fallbackMeta,
    };
  }

  return null;
}
