// src/components/landing/MarketSection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import useCachedFetch from "@/hooks/useCachedFetch";
import DataTableMarket from "@/components/market/DataTableMarket";
import type { MarketItem, RenderedMarketRow } from "@/lib/marketTypes";
import exchangeMetaJson from "@/data/itick/exchange-meta.json";
import navigationJson from "@/data/itick/market-navigation.json";

type TableMarketKey =
  | "acciones"
  | "crypto"
  | "indices"
  | "commodities"
  | "fx"
  | "all";

type ExchangeMetaItem = {
  label: string;
  scope: string;
  market: string;
  region: string;
  apiType: string;
};

type ExchangeMetaMap = Record<string, ExchangeMetaItem>;
type NavigationShape = {
  marketLabels?: Record<string, string>;
};

const exchangeMeta = exchangeMetaJson as ExchangeMetaMap;
const navigation = navigationJson as NavigationShape;
const marketLabels = navigation.marketLabels ?? {};
const REGION_LABEL_OVERRIDES: Record<string, string> = {
  GLOBAL: "Global",
  US: "Estados Unidos",
  GB: "Reino Unido",
  ES: "España",
  TH: "Tailandia",
  IN: "India",
  DE: "Alemania",
  FR: "Francia",
  EU: "Unión Europea",
  HK: "Hong Kong",
  CN: "China",
  SH: "Shanghai",
  SZ: "Shenzhen",
  TW: "Taiwán",
  SG: "Singapur",
  JP: "Japón",
  MY: "Malasia",
  TR: "Turquía",
  MX: "México",
  IT: "Italia",
  IL: "Israel",
  AR: "Argentina",
  AU: "Australia",
  CA: "Canadá",
  PE: "Perú",
  NG: "Nigeria",
  PK: "Pakistán",
  BA: "Binance",
  BT: "Bitget",
  PB: "ProBit",
};
const REGION_DISPLAY_NAMES =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["es"], { type: "region" })
    : null;
const MARKET_BUTTON_TITLES = Object.fromEntries(
  Object.entries(marketLabels).map(([market, label]) => [market, `Mercado: ${label}`])
) as Record<string, string>;
const EXCHANGE_BUTTON_TITLES = Object.fromEntries(
  Object.entries(exchangeMeta).map(([exchange, meta]) => {
    const label = (meta.label ?? "").trim();
    return [exchange, label ? `${exchange} - ${label}` : exchange];
  })
) as Record<string, string>;
const MARKET_ORDER = [
  "acciones",
  "crypto",
  "forex",
  "indices",
  "commodities",
  "funds",
];

function mapMarketToTableMarket(market: string): TableMarketKey {
  switch (market) {
    case "forex":
      return "fx";
    case "funds":
      return "all";
    case "acciones":
      return "acciones";
    case "crypto":
      return "crypto";
    case "indices":
      return "indices";
    case "commodities":
      return "commodities";
    default:
      return "acciones";
  }
}

function getAvailableMarkets(): string[] {
  const marketSet = new Set<string>();

  Object.values(exchangeMeta).forEach((meta) => {
    marketSet.add(meta.market);
  });

  return MARKET_ORDER.filter((market) => marketSet.has(market));
}

function getRegionFiltersForMarket(market: string): string[] {
  const entries = Object.values(exchangeMeta).filter((meta) => meta.market === market);

  const hasUSScope = entries.some((meta) => meta.scope === "US");
  const hasGlobalScope = entries.some((meta) => meta.scope === "GLOBAL");

  const regionSet = new Set<string>();
  entries.forEach((meta) => regionSet.add(meta.region));

  const ordered: string[] = [];

  if (hasUSScope || regionSet.has("US")) ordered.push("US");
  if (hasGlobalScope || regionSet.has("GLOBAL")) ordered.push("GLOBAL");

  const remainingRegions = Array.from(regionSet)
    .filter((region) => region !== "US" && region !== "GLOBAL")
    .sort((a, b) => a.localeCompare(b));

  for (const region of remainingRegions) {
    if (!ordered.includes(region)) ordered.push(region);
  }

  // Remove filters that resolve to the exact same exchange list (e.g. GLOBAL vs GB in forex).
  const deduped: string[] = [];
  const seenSignatures = new Set<string>();

  for (const region of ordered) {
    const signature = getExchangesForMarketRegion(market, region)
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .join("|");

    if (!signature || seenSignatures.has(signature)) continue;
    seenSignatures.add(signature);
    deduped.push(region);
  }

  return deduped;
}

function matchesRegionFilter(meta: ExchangeMetaItem, regionFilter: string) {
  if (regionFilter === "US" || regionFilter === "GLOBAL") {
    return meta.scope === regionFilter || meta.region === regionFilter;
  }

  return meta.region === regionFilter;
}

function getExchangesForMarketRegion(market: string, regionFilter: string): string[] {
  return Object.entries(exchangeMeta)
    .filter(([, meta]) => meta.market === market && matchesRegionFilter(meta, regionFilter))
    .map(([exchange]) => exchange);
}

function getRegionButtonTitle(region: string) {
  return `Región: ${getRegionButtonLabel(region)}`;
}

function getRegionFriendlyName(region: string) {
  const code = region.toUpperCase();
  const override = REGION_LABEL_OVERRIDES[code];
  if (override) return override;

  if (code.length === 2 && REGION_DISPLAY_NAMES) {
    return REGION_DISPLAY_NAMES.of(code) ?? code;
  }

  return code;
}

function getRegionButtonLabel(region: string) {
  const code = region.toUpperCase();
  const name = getRegionFriendlyName(code);

  if (name === code || code === "GLOBAL") return name;
  return `${name} (${code})`;
}

function getDefaultExchange(market: string, regionFilter: string | null): string | null {
  if (!regionFilter) return null;
  return getExchangesForMarketRegion(market, regionFilter)[0] ?? null;
}

interface MarketSectionProps {
  title?: string;
  renderRow: (item: MarketItem) => RenderedMarketRow;
  onMarketChange: (market: string) => void;
  selection?: {
    market: string;
    region?: string | null;
    exchange?: string | null;
    symbol?: string | null;
  } | null;
}

export default function MarketSection({
  title,
  renderRow,
  onMarketChange,
  selection,
}: MarketSectionProps) {
  const markets = useMemo(() => getAvailableMarkets(), []);
  const initialMarket =
    title && markets.includes(title) ? title : (markets[0] ?? "acciones");
  const initialRegion = getRegionFiltersForMarket(initialMarket)[0] ?? null;

  const [market, setMarket] = useState<string>(initialMarket);
  const [regionFilter, setRegionFilter] = useState<string | null>(initialRegion);
  const [subMarket, setSubMarket] = useState<string | null>(
    getDefaultExchange(initialMarket, initialRegion)
  );
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const regionOptions = useMemo(
    () => getRegionFiltersForMarket(market),
    [market]
  );
  const exchanges = useMemo(
    () => (regionFilter ? getExchangesForMarketRegion(market, regionFilter) : []),
    [market, regionFilter]
  );

  useEffect(() => {
    if (!title || title === market) return;
    if (!markets.includes(title)) return;

    const nextRegion = getRegionFiltersForMarket(title)[0] ?? null;

    setMarket(title);
    setRegionFilter(nextRegion);
    setSubMarket(getDefaultExchange(title, nextRegion));
  }, [title, market, markets]);

  useEffect(() => {
    if (!regionFilter || !regionOptions.includes(regionFilter)) {
      const nextRegion = regionOptions[0] ?? null;
      setRegionFilter(nextRegion);
      setSubMarket(getDefaultExchange(market, nextRegion));
      return;
    }

    if (!subMarket || !exchanges.includes(subMarket)) {
      setSubMarket(exchanges[0] ?? null);
    }
  }, [market, regionFilter, regionOptions, exchanges, subMarket]);

  useEffect(() => {
    if (!selection) return;
    if (!selection.market || !markets.includes(selection.market)) return;

    const nextMarket = selection.market;
    const availableRegions = getRegionFiltersForMarket(nextMarket);
    const nextRegion =
      selection.region && availableRegions.includes(selection.region)
        ? selection.region
        : (availableRegions[0] ?? null);
    const availableExchanges = nextRegion
      ? getExchangesForMarketRegion(nextMarket, nextRegion)
      : [];
    const nextExchange =
      selection.exchange && availableExchanges.includes(selection.exchange)
        ? selection.exchange
        : (availableExchanges[0] ?? null);

    setMarket(nextMarket);
    setRegionFilter(nextRegion);
    setSubMarket(nextExchange);
    setSelectedSymbol(selection.symbol?.trim().toUpperCase() ?? null);
    onMarketChange(nextMarket);
  }, [selection, markets, onMarketChange]);

  const apiUrl = useMemo(() => {
    if (!market || !subMarket || !regionFilter) return null;
    const baseUrl = `/api/itick/markets?scope=${encodeURIComponent(
      regionFilter
    )}&market=${encodeURIComponent(market)}&exchange=${encodeURIComponent(
      subMarket
    )}&limit=9`;

    if (!selectedSymbol) return baseUrl;
    return `${baseUrl}&symbol=${encodeURIComponent(selectedSymbol)}`;
  }, [market, subMarket, regionFilter, selectedSymbol]);

  const { data, loading, error } = useCachedFetch(apiUrl ?? "", [
    market,
    regionFilter,
    subMarket,
    selectedSymbol,
  ]);
  const marketNoDataMessage = useMemo(() => {
    if (!data || Array.isArray(data) || typeof data !== "object") return null;

    const payload = data as { no_market_data?: boolean; message?: string };
    if (!payload.no_market_data) return null;

    return (
      payload.message ?? "iTICK no devolvió datos para esta región/símbolos"
    );
  }, [data]);

  const rows = useMemo(() => {
    if (!Array.isArray(data)) return [];

    const tableMarket = mapMarketToTableMarket(market);

    return data.map((item) => ({
      ...renderRow(item),
      latestTradingDay: item.latestTradingDay,
      market: tableMarket,
      source: item.source,
      name: item.name ?? null,
      sector: item.sector ?? null,
      logo: item.logo ?? null,
      logoFallback: item.logoFallback ?? null,
    }));
  }, [data, renderRow, market]);

  return (
    <section className="px-4 md:px-12 py-8">
      {/* MARKETS */}
      <div className="flex flex-wrap gap-2 mb-4">
        {markets.map((marketKey) => (
          <button
            key={marketKey}
            onClick={() => {
              const nextRegion = getRegionFiltersForMarket(marketKey)[0] ?? null;
              setMarket(marketKey);
              setRegionFilter(nextRegion);
              setSubMarket(getDefaultExchange(marketKey, nextRegion));
              setSelectedSymbol(null);
              onMarketChange(marketKey);
            }}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              market === marketKey
                ? "bg-yellow-400 text-black"
                : "bg-gray-800 text-yellow-300 hover:bg-gray-700"
            }`}
            title={MARKET_BUTTON_TITLES[marketKey] ?? `Mercado: ${marketKey}`}
          >
            {marketLabels[marketKey] ?? marketKey}
          </button>
        ))}
      </div>

      {/* REGIONS */}
      <div className="flex flex-wrap gap-2 mb-4">
        {regionOptions.map((region) => (
          <button
            key={region}
            onClick={() => {
              setRegionFilter(region);
              setSubMarket(getDefaultExchange(market, region));
              setSelectedSymbol(null);
            }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              regionFilter === region
                ? "bg-yellow-300 text-black"
                : "bg-gray-800 text-yellow-300 hover:bg-gray-700"
            }`}
            title={getRegionButtonTitle(region)}
          >
            {getRegionButtonLabel(region)}
          </button>
        ))}
      </div>

      {/* SUBMARKETS */}
      <div className="flex flex-wrap gap-2 mb-6">
        {exchanges.map((exchange) => (
          <button
            key={exchange}
            onClick={() => {
              setSubMarket(exchange);
              setSelectedSymbol(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              subMarket === exchange
                ? "bg-yellow-400 text-black"
                : "bg-gray-800 text-yellow-300 hover:bg-gray-700"
            }`}
            title={EXCHANGE_BUTTON_TITLES[exchange] ?? exchange}
          >
            {exchange}
          </button>
        ))}
      </div>

      <div id="markets-table">
        <DataTableMarket
          rows={rows}
          market={mapMarketToTableMarket(market)}
          loading={loading}
          error={error ?? marketNoDataMessage}
        />
      </div>
    </section>
  );
}
