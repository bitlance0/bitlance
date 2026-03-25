import exchangeMetaJson from "@/data/itick/exchange-meta.json";

type ExchangeMetaItem = {
  label?: string;
  scope?: string;
  market?: string;
  region?: string;
  apiType?: string;
};

type ExchangeMetaMap = Record<string, ExchangeMetaItem>;

export type DashboardMarketKey =
  | "favoritas"
  | "fx"
  | "indices"
  | "acciones"
  | "commodities"
  | "crypto"
  | "all";

const exchangeMeta = exchangeMetaJson as ExchangeMetaMap;

const DASHBOARD_MARKETS: DashboardMarketKey[] = [
  "favoritas",
  "fx",
  "indices",
  "acciones",
  "commodities",
  "crypto",
  "all",
];

const DASHBOARD_TO_CANONICAL: Record<DashboardMarketKey, string> = {
  favoritas: "favoritas",
  fx: "forex",
  indices: "indices",
  acciones: "acciones",
  commodities: "commodities",
  crypto: "crypto",
  all: "funds",
};

const CANONICAL_TO_DASHBOARD: Record<string, DashboardMarketKey> = {
  favoritas: "favoritas",
  forex: "fx",
  indices: "indices",
  acciones: "acciones",
  commodities: "commodities",
  crypto: "crypto",
  funds: "all",
};

const MARKET_LABELS: Record<DashboardMarketKey, string> = {
  favoritas: "Favoritas",
  fx: "Forex",
  indices: "Indices",
  acciones: "Acciones",
  commodities: "Futuros",
  crypto: "Crypto",
  all: "Funds",
};

const REGION_LABEL_OVERRIDES: Record<string, string> = {
  GLOBAL: "Global",
  US: "Estados Unidos",
  GB: "Reino Unido",
  ES: "Espana",
  TH: "Tailandia",
  IN: "India",
  DE: "Alemania",
  FR: "Francia",
  EU: "Union Europea",
  HK: "Hong Kong",
  CN: "China",
  SH: "Shanghai",
  SZ: "Shenzhen",
  TW: "Taiwan",
  SG: "Singapur",
  JP: "Japon",
  MY: "Malasia",
  TR: "Turquia",
  MX: "Mexico",
  IT: "Italia",
  IL: "Israel",
  AR: "Argentina",
  AU: "Australia",
  CA: "Canada",
  PE: "Peru",
  NG: "Nigeria",
  PK: "Pakistan",
  BA: "Binance",
  BT: "Bitget",
  PB: "ProBit",
};

const REGION_DISPLAY_NAMES =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["es"], { type: "region" })
    : null;

function isDashboardMarket(value: string): value is DashboardMarketKey {
  return DASHBOARD_MARKETS.includes(value as DashboardMarketKey);
}

export function toCanonicalMarket(
  dashboardMarket: DashboardMarketKey | string | null | undefined
): string {
  if (!dashboardMarket) return "indices";
  if (isDashboardMarket(dashboardMarket)) {
    return DASHBOARD_TO_CANONICAL[dashboardMarket];
  }
  return dashboardMarket;
}

export function toDashboardMarket(
  canonicalMarket: string | null | undefined
): DashboardMarketKey {
  if (!canonicalMarket) return "indices";
  if (isDashboardMarket(canonicalMarket)) return canonicalMarket;
  return CANONICAL_TO_DASHBOARD[canonicalMarket] ?? "indices";
}

export function getDashboardMarketLabel(market: DashboardMarketKey) {
  return MARKET_LABELS[market] ?? market;
}

function matchesRegionFilter(meta: ExchangeMetaItem, regionFilter: string) {
  const scope = (meta.scope ?? "").toUpperCase();
  const region = (meta.region ?? "").toUpperCase();
  const normalizedFilter = regionFilter.toUpperCase();

  if (normalizedFilter === "US" || normalizedFilter === "GLOBAL") {
    return scope === normalizedFilter || region === normalizedFilter;
  }

  return region === normalizedFilter;
}

function normalizeExchangeMarket(metaMarket: string | undefined) {
  return toDashboardMarket(metaMarket ?? "");
}

export function getAvailableDashboardMarkets(): DashboardMarketKey[] {
  const available = new Set<DashboardMarketKey>();
  available.add("favoritas");

  for (const meta of Object.values(exchangeMeta)) {
    available.add(normalizeExchangeMarket(meta.market));
  }

  return DASHBOARD_MARKETS.filter((market) => available.has(market));
}

export function getRegionsForDashboardMarket(
  dashboardMarket: DashboardMarketKey
): string[] {
  if (dashboardMarket === "favoritas") {
    return [];
  }

  const entries = Object.values(exchangeMeta).filter(
    (meta) => normalizeExchangeMarket(meta.market) === dashboardMarket
  );

  if (!entries.length) return [];

  const hasUSScope = entries.some((meta) => (meta.scope ?? "").toUpperCase() === "US");
  const hasGlobalScope = entries.some(
    (meta) => (meta.scope ?? "").toUpperCase() === "GLOBAL"
  );

  const regionSet = new Set<string>();
  for (const meta of entries) {
    const region = (meta.region ?? "").toUpperCase();
    if (region) regionSet.add(region);
  }

  const ordered: string[] = [];
  if (hasUSScope || regionSet.has("US")) ordered.push("US");
  if (hasGlobalScope || regionSet.has("GLOBAL")) ordered.push("GLOBAL");

  const remaining = Array.from(regionSet)
    .filter((region) => region !== "US" && region !== "GLOBAL")
    .sort((a, b) => a.localeCompare(b));

  for (const region of remaining) {
    if (!ordered.includes(region)) ordered.push(region);
  }

  // Remove region buttons that lead to the same exchange signature.
  const deduped: string[] = [];
  const signatures = new Set<string>();

  for (const region of ordered) {
    const signature = getExchangesForDashboardMarket(dashboardMarket, region)
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .join("|");

    if (!signature || signatures.has(signature)) continue;
    signatures.add(signature);
    deduped.push(region);
  }

  return deduped;
}

export function getExchangesForDashboardMarket(
  dashboardMarket: DashboardMarketKey,
  regionFilter: string
): string[] {
  if (dashboardMarket === "favoritas") {
    return [];
  }

  return Object.entries(exchangeMeta)
    .filter(
      ([, meta]) =>
        normalizeExchangeMarket(meta.market) === dashboardMarket &&
        matchesRegionFilter(meta, regionFilter)
    )
    .map(([exchange]) => exchange)
    .sort((a, b) => a.localeCompare(b));
}

export function getDefaultSelectionForDashboardMarket(
  dashboardMarket: DashboardMarketKey
) {
  const regions = getRegionsForDashboardMarket(dashboardMarket);
  const scope = regions[0] ?? null;

  if (!scope) {
    return {
      scope: null,
      exchange: null,
    };
  }

  const exchange = getExchangesForDashboardMarket(dashboardMarket, scope)[0] ?? null;

  return {
    scope,
    exchange,
  };
}

export function getRegionLabel(region: string) {
  const code = region.toUpperCase();
  const override = REGION_LABEL_OVERRIDES[code];
  if (override) return `${override} (${code})`;

  if (code === "GLOBAL") return "Global";

  if (code.length === 2 && REGION_DISPLAY_NAMES) {
    const named = REGION_DISPLAY_NAMES.of(code);
    if (named && named !== code) return `${named} (${code})`;
  }

  return code;
}
