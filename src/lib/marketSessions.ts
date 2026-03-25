import marketNavigationJson from "@/data/itick/market-navigation.json";
import marketStructureJson from "@/data/itick/itick_market_structure.json";
import SYMBOLS_MAP from "@/lib/symbolsMap";

type MarketStructure = Record<string, Record<string, string[]>>;
type NavigationData = {
  marketAliases?: Record<string, string>;
};

const marketStructure = marketStructureJson as MarketStructure;
const navigation = marketNavigationJson as NavigationData;
const marketAliases = navigation.marketAliases ?? {};
const symbolMarketIndex = buildSymbolMarketIndex();
const fallbackSymbolMarketIndex = buildFallbackSymbolMarketIndex();

function normalizeSymbolCode(symbol: string) {
  if (/^\d+\.0+$/.test(symbol)) {
    return symbol.replace(/\.0+$/, "");
  }
  return symbol;
}

function normalizeMarket(raw: string | null | undefined) {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return "";
  if (value === "fx") return "forex";
  if (value === "stock") return "acciones";
  if (value === "future") return "commodities";
  if (value === "fund" || value === "all") return "funds";
  const canonical = marketAliases[value];
  if (canonical && canonical !== value) {
    return normalizeMarket(canonical);
  }
  return value;
}

function buildSymbolMarketIndex() {
  const index = new Map<string, string>();

  for (const [rawMarket, exchanges] of Object.entries(marketStructure)) {
    const market = normalizeMarket(rawMarket);
    if (!market) continue;

    for (const symbols of Object.values(exchanges)) {
      for (const symbolRaw of symbols) {
        const symbol = normalizeSymbolCode(symbolRaw).toUpperCase();
        if (!symbol || index.has(symbol)) continue;
        index.set(symbol, market);
      }
    }
  }

  return index;
}

function normalizeFallbackMarket(rawMarket: string) {
  if (rawMarket === "fx") return "forex";
  return normalizeMarket(rawMarket);
}

function buildFallbackSymbolMarketIndex() {
  const index = new Map<string, string>();

  for (const [rawMarket, symbols] of Object.entries(SYMBOLS_MAP)) {
    const market = normalizeFallbackMarket(rawMarket);
    if (!market) continue;

    for (const symbolRaw of symbols) {
      const symbol = normalizeSymbolCode(symbolRaw).toUpperCase();
      if (!symbol || index.has(symbol)) continue;
      index.set(symbol, market);
    }
  }

  return index;
}

export function marketOfSymbol(sym: string | null): string {
  if (!sym) return "acciones";
  const symbol = normalizeSymbolCode(sym).toUpperCase();

  const indexedMarket = symbolMarketIndex.get(symbol);
  if (indexedMarket) return indexedMarket;

  const fallbackMarket = fallbackSymbolMarketIndex.get(symbol);
  if (fallbackMarket) return fallbackMarket;

  if (symbol.endsWith("USDT")) return "crypto";
  if (/^[A-Z]{6}$/.test(symbol)) return "forex";
  if (/^(MNQ|MES|NQ|ES|CL|GC|SI|HG|NG|ZC|ZS|ZW|YM|RTY)/.test(symbol)) {
    return "commodities";
  }

  return "acciones";
}

export function isMarketOpenForMarket(market: string, now: Date): boolean {
  const utc = new Date(now.toISOString());
  const day = utc.getUTCDay();
  const hour = utc.getUTCHours();
  const minute = utc.getUTCMinutes();
  const timeMinutes = hour * 60 + minute;

  const inRange = (startHour: number, startMinute: number, endHour: number, endMinute: number) => {
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    return timeMinutes >= start && timeMinutes <= end;
  };

  if (market === "crypto") return true;

  if (market === "fx" || market === "forex") {
    if (day === 0 || day === 6) return false;
    return true;
  }

  if (["indices", "acciones", "commodities"].includes(market)) {
    if (day === 0 || day === 6) return false;
    return inRange(14, 30, 21, 0);
  }

  if (day === 0 || day === 6) return false;
  return inRange(13, 0, 21, 0);
}

export function isSymbolMarketOpen(symbol: string | null, now = new Date()) {
  const market = marketOfSymbol(symbol);
  const open = isMarketOpenForMarket(market, now);
  return { open, market };
}
