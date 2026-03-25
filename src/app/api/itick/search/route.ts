// src/app/api/itick/search/route.ts
import { NextResponse } from "next/server";
import marketStructureJson from "@/data/itick/itick_market_structure.json";
import symbolMetaJson from "@/data/itick/itick_symbol_meta.json";
import exchangeMetaJson from "@/data/itick/exchange-meta.json";
import marketNavigationJson from "@/data/itick/market-navigation.json";

type MarketStructure = Record<string, Record<string, string[]>>;
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
type ExchangeMetaItem = {
  label?: string;
  scope?: string;
  market?: string;
  region?: string;
  apiType?: string;
};
type ExchangeMetaMap = Record<string, ExchangeMetaItem>;
type NavigationData = {
  marketLabels?: Record<string, string>;
  marketAliases?: Record<string, string>;
};

type SearchResultItem = {
  market: string;
  marketCanonical: string;
  marketLabel: string;
  exchange: string;
  exchangeLabel: string | null;
  region: string;
  scope: string;
  symbol: string;
  name: string | null;
  sector: string | null;
  logo: string | null;
  apiType: string | null;
};
type ScoredResultItem = SearchResultItem & { score: number };

const structure = marketStructureJson as MarketStructure;
const symbolMeta = symbolMetaJson as SymbolMetaMap;
const exchangeMeta = exchangeMetaJson as ExchangeMetaMap;
const navigation = marketNavigationJson as NavigationData;
const marketLabels = navigation.marketLabels ?? {};
const marketAliases = navigation.marketAliases ?? {};
const reverseAliases = Object.entries(marketAliases).reduce<Record<string, string[]>>(
  (acc, [alias, canonical]) => {
    if (!acc[canonical]) {
      acc[canonical] = [];
    }
    acc[canonical].push(alias);
    return acc;
  },
  {}
);

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveOutputMarket(canonicalMarket: string): string {
  const aliases = reverseAliases[canonicalMarket] ?? [];
  return aliases[0] ?? canonicalMarket;
}

function scoreField(query: string, value: string, weight: number): number {
  if (!value) return Number.POSITIVE_INFINITY;
  if (value === query) return weight;
  if (value.startsWith(query)) return 100 + weight;
  if (value.includes(query)) return 200 + weight;
  return Number.POSITIVE_INFINITY;
}

function computeScore(params: {
  query: string;
  symbol: string;
  name: string;
  exchange: string;
  exchangeLabel: string;
  region: string;
  scope: string;
  market: string;
  marketLabel: string;
  sector: string;
  logo: string;
  apiType: string;
}) {
  const {
    query,
    symbol,
    name,
    exchange,
    exchangeLabel,
    region,
    scope,
    market,
    marketLabel,
    sector,
    logo,
    apiType,
  } = params;

  const scores = [
    scoreField(query, symbol, 0),
    scoreField(query, name, 10),
    scoreField(query, exchange, 15),
    scoreField(query, exchangeLabel, 18),
    scoreField(query, region, 3),
    scoreField(query, scope, 6),
    scoreField(query, market, 20),
    scoreField(query, marketLabel, 22),
    scoreField(query, sector, 30),
    scoreField(query, logo, 40),
    scoreField(query, apiType, 35),
  ];

  return Math.min(...scores);
}

export async function GET(req: Request) {
  const startedAt = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") ?? "").trim();
    const limitParam = (searchParams.get("limit") ?? "5").trim().toLowerCase();

    if (!query || query.length < 2) {
      return NextResponse.json({
        query,
        total: 0,
        returned: 0,
        remaining: 0,
        results: [],
        tookMs: Date.now() - startedAt,
      });
    }

    const defaultLimit = 5;
    const maxLimit = 5000;
    const parsedLimit = Number(limitParam);
    const limit =
      limitParam === "all"
        ? Number.MAX_SAFE_INTEGER
        : Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.min(Math.floor(parsedLimit), maxLimit)
          : defaultLimit;

    const needle = normalizeText(query);
    const seen = new Set<string>();
    const matches: ScoredResultItem[] = [];

    for (const [canonicalMarket, exchanges] of Object.entries(structure)) {
      const outputMarket = resolveOutputMarket(canonicalMarket);
      const marketLabel = marketLabels[outputMarket] ?? marketLabels[canonicalMarket] ?? outputMarket;

      for (const [exchange, symbols] of Object.entries(exchanges)) {
        const exchangeConfig = exchangeMeta[exchange] ?? {};
        const exchangeLabel = exchangeConfig.label ?? null;
        const region = (exchangeConfig.region ?? "").toUpperCase();
        const scope = (exchangeConfig.scope ?? "").toUpperCase();
        const apiType = exchangeConfig.apiType ?? null;
        const symbolsMeta = symbolMeta?.[canonicalMarket]?.[exchange] ?? {};

        for (const symbol of symbols) {
          const uniqueKey = `${canonicalMarket}|${exchange}|${symbol}`;
          if (seen.has(uniqueKey)) continue;
          seen.add(uniqueKey);

          const meta = symbolsMeta[symbol];
          const name = meta?.name ?? null;
          const sector = meta?.sector ?? null;
          const logo = meta?.logo ?? null;

          const score = computeScore({
            query: needle,
            symbol: normalizeText(symbol),
            name: normalizeText(name ?? ""),
            exchange: normalizeText(exchange),
            exchangeLabel: normalizeText(exchangeLabel ?? ""),
            region: normalizeText(region),
            scope: normalizeText(scope),
            market: normalizeText(outputMarket),
            marketLabel: normalizeText(marketLabel),
            sector: normalizeText(sector ?? ""),
            logo: normalizeText(logo ?? ""),
            apiType: normalizeText(apiType ?? ""),
          });

          if (!Number.isFinite(score)) continue;

          matches.push({
            market: outputMarket,
            marketCanonical: canonicalMarket,
            marketLabel,
            exchange,
            exchangeLabel,
            region,
            scope,
            symbol,
            name,
            sector,
            logo,
            apiType,
            score,
          });
        }
      }
    }

    matches.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
      if (a.exchange !== b.exchange) return a.exchange.localeCompare(b.exchange);
      return a.market.localeCompare(b.market);
    });

    const total = matches.length;
    const results = matches.slice(0, limit).map(({ score: _score, ...item }) => item);

    return NextResponse.json({
      query,
      total,
      returned: results.length,
      remaining: Math.max(total - results.length, 0),
      results,
      tookMs: Date.now() - startedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error interno en busqueda iTICK",
        detail: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}
