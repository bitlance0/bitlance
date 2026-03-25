import type { MarketQuote } from "@/types/interfaces";

export const ITICK_DEFAULT_FAVORITE_SYMBOLS = [
  "EURUSD",
  "USDJPY",
  "USDCNY",
  "GBPUSD",
  "USDCAD",
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "BNBUSDT",
] as string[];

export const ITICK_MAX_FAVORITES = 15;
const ITICK_FAVORITES_STORAGE_KEY = "itick:favorites:v1";
const ITICK_FAVORITE_CONTEXTS_KEY = "itick:favorites:contexts:v1";

type FavoriteDeltaStorage = {
  added?: string[];
  removed?: string[];
};

export type FavoriteSymbolContext = {
  market?: string | null;
  exchange?: string | null;
  scope?: string | null;
};

type FavoriteContextStorage = Record<string, FavoriteSymbolContext>;

function normalizeSymbol(symbol: string | null | undefined) {
  return String(symbol ?? "").trim().toUpperCase();
}

function normalizeSymbols(symbols: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const symbol of symbols) {
    const value = normalizeSymbol(symbol);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

function normalizeMarket(market: string | null | undefined) {
  const m = String(market ?? "").trim().toLowerCase();
  if (!m) return "";
  if (m === "fx") return "forex";
  if (m === "stock") return "acciones";
  if (m === "future") return "commodities";
  if (m === "fund") return "funds";
  if (m === "all") return "funds";
  return m;
}

function sanitizeContext(context?: FavoriteSymbolContext | null): FavoriteSymbolContext {
  if (!context) return {};

  const market = normalizeMarket(context.market);
  const exchange = normalizeSymbol(context.exchange);
  const scope = normalizeSymbol(context.scope);

  return {
    market: market || undefined,
    exchange: exchange || undefined,
    scope: scope || undefined,
  };
}

function readFavoriteContextStorage(): FavoriteContextStorage {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(ITICK_FAVORITE_CONTEXTS_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as FavoriteContextStorage;
    if (!parsed || typeof parsed !== "object") return {};

    const next: FavoriteContextStorage = {};
    for (const [symbol, context] of Object.entries(parsed)) {
      const key = normalizeSymbol(symbol);
      if (!key) continue;
      next[key] = sanitizeContext(context);
    }
    return next;
  } catch {
    return {};
  }
}

function writeFavoriteContextStorage(data: FavoriteContextStorage) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ITICK_FAVORITE_CONTEXTS_KEY, JSON.stringify(data));
}

function buildFavoriteRank(favoriteSymbols: string[]) {
  return new Map<string, number>(
    favoriteSymbols.map((symbol, index) => [symbol.toUpperCase(), index])
  );
}

export function resolveFavoriteSymbolsFromStorage(
  defaults: string[] = ITICK_DEFAULT_FAVORITE_SYMBOLS
) {
  const normalizedDefaults = normalizeSymbols(defaults).slice(0, ITICK_MAX_FAVORITES);
  if (typeof window === "undefined") return normalizedDefaults;

  try {
    const raw = window.localStorage.getItem(ITICK_FAVORITES_STORAGE_KEY);
    if (!raw) return normalizedDefaults;

    const parsed = JSON.parse(raw) as FavoriteDeltaStorage;
    const removed = normalizeSymbols(parsed.removed ?? []);
    const added = normalizeSymbols(parsed.added ?? []);

    const removedSet = new Set(removed);
    const base = normalizedDefaults.filter((symbol) => !removedSet.has(symbol));
    const merged = normalizeSymbols([...added, ...base]).slice(0, ITICK_MAX_FAVORITES);

    return merged.length ? merged : normalizedDefaults;
  } catch {
    return normalizedDefaults;
  }
}

export function persistFavoriteDeltas(
  favoriteSymbols: string[],
  defaults: string[] = ITICK_DEFAULT_FAVORITE_SYMBOLS
) {
  if (typeof window === "undefined") return;

  const normalizedDefaults = normalizeSymbols(defaults).slice(0, ITICK_MAX_FAVORITES);
  const normalizedFavorites = normalizeSymbols(favoriteSymbols).slice(
    0,
    ITICK_MAX_FAVORITES
  );

  const favoriteSet = new Set(normalizedFavorites);
  const defaultSet = new Set(normalizedDefaults);

  const removed = normalizedDefaults.filter((symbol) => !favoriteSet.has(symbol));
  const added = normalizedFavorites.filter((symbol) => !defaultSet.has(symbol));

  if (!removed.length && !added.length) {
    window.localStorage.removeItem(ITICK_FAVORITES_STORAGE_KEY);
    return;
  }

  const payload: FavoriteDeltaStorage = { added, removed };
  window.localStorage.setItem(ITICK_FAVORITES_STORAGE_KEY, JSON.stringify(payload));
}

export function saveFavoriteContext(symbol: string, context?: FavoriteSymbolContext | null) {
  if (typeof window === "undefined") return;

  const normalized = normalizeSymbol(symbol);
  if (!normalized) return;

  const sanitized = sanitizeContext(context);
  if (!sanitized.market && !sanitized.exchange && !sanitized.scope) return;

  const current = readFavoriteContextStorage();
  current[normalized] = {
    ...current[normalized],
    ...sanitized,
  };
  writeFavoriteContextStorage(current);
}

export function getFavoriteContext(symbol: string) {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) return null;
  const all = readFavoriteContextStorage();
  return all[normalized] ?? null;
}

export function resolveFavoriteContextMapFromStorage() {
  return readFavoriteContextStorage();
}

export function applyFavoriteOrder(
  rows: MarketQuote[],
  favoriteSymbols: string[] = ITICK_DEFAULT_FAVORITE_SYMBOLS
): MarketQuote[] {
  const favoriteRank = buildFavoriteRank(
    normalizeSymbols(favoriteSymbols).slice(0, ITICK_MAX_FAVORITES)
  );

  const ordered = [...rows].sort((a, b) => {
    const aSymbol = (a.symbol ?? "").toUpperCase();
    const bSymbol = (b.symbol ?? "").toUpperCase();
    const aRank = favoriteRank.get(aSymbol);
    const bRank = favoriteRank.get(bSymbol);

    const aIsFavorite = aRank !== undefined;
    const bIsFavorite = bRank !== undefined;

    if (aIsFavorite && bIsFavorite) return (aRank ?? 0) - (bRank ?? 0);
    if (aIsFavorite) return -1;
    if (bIsFavorite) return 1;
    return aSymbol.localeCompare(bSymbol);
  });

  return ordered.map((row) => {
    const symbol = (row.symbol ?? "").toUpperCase();
    return {
      ...row,
      isFavorite: favoriteRank.has(symbol),
    };
  });
}
