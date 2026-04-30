// src/stores/useMarketStore.ts
import { MARKETS } from "@/lib/markets";
import { MarketQuote } from "@/types/interfaces";
import { create } from "zustand";
import exchangeMetaJson from "@/data/itick/exchange-meta.json";
import {
  getDefaultSelectionForDashboardMarket,
  toCanonicalMarket,
  toDashboardMarket,
} from "@/lib/itick/dashboardMarketHelpers";
import {
  applyFavoriteOrder,
  type FavoriteSymbolContext,
  ITICK_MAX_FAVORITES,
  getFavoriteContext,
  persistFavoriteDeltas,
  resolveFavoriteSymbolsFromStorage,
  saveFavoriteContext,
} from "@/lib/itick/favorites";

/* ===================== Tipos ===================== */

export interface MarketFilters {
  search: string;
  sortBy: "price" | "change" | "volume" | null;
}

export type MarketKey = (typeof MARKETS)[number];
type Prices = Record<string, number>;
type QuoteContext = {
  market?: string | null;
  scope?: string | null;
  exchange?: string | null;
};
type ExchangeMetaMap = Record<
  string,
  {
    scope?: string;
    region?: string;
    market?: string;
  }
>;

interface MarketState {
  markets: MarketKey[];
  dataMarket: MarketQuote[];
  selectedMarket: MarketKey | null;
  selectedScope: string | null;
  selectedExchange: string | null;
  selectedSymbol: string | null;
  preferredSymbol: string | null;
  favoriteSymbols: string[];
  filters: MarketFilters;
  isLoading: boolean;
  marketMessage: string | null;
  dataSymbolOperation: MarketQuote | null;
  livePrices: Prices;
  sseMarket: string | null;
  switchingMarket: boolean;
  requestVersion: number;

  setDataMarket: (markets: MarketQuote[]) => void;
  setSelectedMarket: (market: MarketKey | null) => void;
  setSelectedScope: (scope: string | null) => void;
  setSelectedExchange: (exchange: string | null) => void;
  setSelectedSymbol: (symbol: string | null) => void;
  setPreferredSymbol: (symbol: string | null) => void;
  toggleFavoriteSymbol: (symbol: string, context?: FavoriteSymbolContext) => void;
  setFilters: (filters: Partial<MarketFilters>) => void;
  setIsLoading: (value: boolean) => void;
  setMarketMessage: (value: string | null) => void;
  setSearchTerm: (term: string) => void;
  setDataSymbolOperation: (data: MarketQuote) => void;

  fetchMarket: (marketKey: string) => Promise<void>;
  startMarketStream: (marketKey: string) => void;
  stopMarketStream: () => void;
  selectMarket: (marketKey: string) => Promise<void>;
  applyLivePrices: () => void;
  getLivePrice: (symbol: string) => number | undefined;
  startLocalPriceSimulation: () => void;
  stopLocalPriceSimulation: () => void;
  refreshSymbolQuote: (
    symbol: string,
    context?: QuoteContext
  ) => Promise<number | undefined>;
}

/* ===================== SSE globals ===================== */

let esRef: EventSource | null = null;
let reconnectTimer: any = null;
let currentMarketForSSE: string | null = null;

/* ===================== Stream throttling ===================== */

// ⬇⬇⬇ VELOCIDAD REAL DEL STREAM (ajusta aquí) ⬇⬇⬇
const APPLY_INTERVAL_MS = 4_000;

// Buffer NO reactivo
let priceBuffer: Prices = {};
let applyTimer: any = null;
let localSimTimer: ReturnType<typeof setInterval> | null = null;
const exchangeMeta = exchangeMetaJson as ExchangeMetaMap;

const SIMULATION_INTERVAL_MS = 1_400;
const SIMULATION_MOVE_BPS: Record<string, number> = {
  crypto: 9,
  forex: 2,
  indices: 4,
  acciones: 6,
  commodities: 5,
  funds: 2,
};

function normalizeMarketKey(value: string | null | undefined) {
  const market = String(value ?? "").trim().toLowerCase();
  if (!market) return "";
  if (market === "fx") return "forex";
  if (market === "stock") return "acciones";
  if (market === "future") return "commodities";
  if (market === "fund") return "funds";
  if (market === "all") return "funds";
  return market;
}

function inferMarketFromSymbol(symbol: string) {
  const upper = symbol.toUpperCase();
  if (upper.endsWith("USDT")) return "crypto";
  if (/^[A-Z]{6}$/.test(upper)) return "forex";
  return "acciones";
}

function roundPrice(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value >= 1000) return Number(value.toFixed(2));
  if (value >= 10) return Number(value.toFixed(4));
  if (value >= 1) return Number(value.toFixed(5));
  return Number(value.toFixed(6));
}

function isMarketOpenNow(market: string, now: Date) {
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

  if (market === "forex") {
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

function hydratePricesFromRows(rows: MarketQuote[], previous: Prices): Prices {
  const next: Prices = { ...previous };
  for (const row of rows) {
    const symbol = String(row.symbol ?? "").trim().toUpperCase();
    const price = Number(row.price);
    if (!symbol || !Number.isFinite(price) || price <= 0) continue;
    next[symbol] = price;
  }
  return next;
}

/* ===================== SSE helpers ===================== */

function openSSE(market: string, onPrices: (p: Prices) => void) {
  if (esRef) {
    try { esRef.close(); } catch {}
    esRef = null;
  }

  currentMarketForSSE = market;
  const url = `/api/alpha-stream?market=${encodeURIComponent(market)}`;
  const es = new EventSource(url);
  esRef = es;

  es.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data?.prices && typeof data.prices === "object") {
        onPrices(data.prices as Prices);
      }
    } catch {
      // ignore
    }
  };

  es.onerror = () => {
    try { es.close(); } catch {}
    esRef = null;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      if (currentMarketForSSE) {
        openSSE(currentMarketForSSE, onPrices);
      }
    }, 1500);
  };
}

function closeSSE() {
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  currentMarketForSSE = null;

  if (esRef) {
    try { esRef.close(); } catch {}
    esRef = null;
  }
}

/* ===================== Utils ===================== */

function mergePrices(base: MarketQuote[], prices: Prices): MarketQuote[] {
  if (!base?.length || !prices) return base;

  return base.map((q) => {
    const qa: any = q;
    const sym = String(qa.symbol || qa.ticker || qa.code || "").toUpperCase();
    const p = prices[sym];

    if (typeof p === "number") {
      return {
        ...q,
        price: p,
        lastPrice: p,
      } as MarketQuote;
    }
    return q;
  });
}

function resolveScopeByContext(params: {
  market: string;
  exchange: string;
  selectedScope: string | null;
  favoriteScope?: string | null;
}) {
  const { market, exchange, selectedScope, favoriteScope } = params;
  const exchangeInfo = exchangeMeta[exchange];

  const preferred = String(
    favoriteScope ?? selectedScope ?? exchangeInfo?.scope ?? exchangeInfo?.region ?? ""
  )
    .trim()
    .toUpperCase();
  if (preferred) return preferred;

  if (market === "crypto" || market === "forex") return "GLOBAL";
  return "US";
}

function simulateRowQuote(row: MarketQuote): MarketQuote {
  const symbol = String(row.symbol ?? "").toUpperCase();
  const current = Number(row.price);
  if (!symbol || !Number.isFinite(current) || current <= 0) return row;

  const market = normalizeMarketKey(row.market) || inferMarketFromSymbol(symbol);
  if (!isMarketOpenNow(market, new Date())) return row;
  const maxMoveBps = SIMULATION_MOVE_BPS[market] ?? 4;
  const randomSignedBps = (Math.random() * 2 - 1) * maxMoveBps;
  const candidate = current * (1 + randomSignedBps / 10_000);
  const nextPrice = roundPrice(Math.max(candidate, 0.000001));

  if (nextPrice === current) return row;

  const previousCloseRaw =
    Number(row.previousClose) > 0
      ? Number(row.previousClose)
      : Number.isFinite(Number(row.change))
      ? current - Number(row.change)
      : current;

  const previousClose =
    Number.isFinite(previousCloseRaw) && previousCloseRaw > 0
      ? previousCloseRaw
      : current;

  const change = nextPrice - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

  return {
    ...row,
    price: nextPrice,
    latestTradingDay: new Date().toISOString(),
    previousClose,
    change,
    changePercent,
  };
}

/* ===================== Store ===================== */

export const useMarketStore = create<MarketState>((set, get) => ({
  markets: [...MARKETS],
  dataMarket: [],
  selectedMarket: null,
  selectedScope: null,
  selectedExchange: null,
  selectedSymbol: null,
  preferredSymbol: null,
  favoriteSymbols: resolveFavoriteSymbolsFromStorage(),
  filters: { search: "", sortBy: null },
  isLoading: false,
  marketMessage: null,
  dataSymbolOperation: null,
  livePrices: {},
  sseMarket: null,
  switchingMarket: false,
  requestVersion: 0,

  /* ---------- setters ---------- */

  setDataMarket: (dataMarket) =>
    set((state) => ({
      dataMarket,
      livePrices: hydratePricesFromRows(dataMarket, state.livePrices),
    })),
  setSelectedMarket: (market) => set({ selectedMarket: market }),
  setSelectedScope: (scope) => set({ selectedScope: scope }),
  setSelectedExchange: (exchange) => set({ selectedExchange: exchange }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setPreferredSymbol: (symbol) => set({ preferredSymbol: symbol }),
  toggleFavoriteSymbol: (symbol, context) => {
    const normalized = (symbol ?? "").trim().toUpperCase();
    if (!normalized) return;

    set((state) => {
      const current = state.favoriteSymbols.map((s) => s.toUpperCase());
      const exists = current.includes(normalized);
      const nextRaw = exists
        ? current.filter((s) => s !== normalized)
        : [normalized, ...current];
      const nextFavorites = nextRaw.slice(0, ITICK_MAX_FAVORITES);
      const favoriteSet = new Set(nextFavorites);

      const updatedRows = state.dataMarket.map((row) => {
        const rowSymbol = String(row.symbol ?? "").toUpperCase();
        const rowIsFavorite = favoriteSet.has(rowSymbol);
        if (row.isFavorite === rowIsFavorite) return row;
        return {
          ...row,
          isFavorite: rowIsFavorite,
        };
      });

      const shouldReorder = state.selectedMarket === "favoritas";

      return {
        favoriteSymbols: nextFavorites,
        dataMarket: shouldReorder
          ? applyFavoriteOrder(updatedRows, nextFavorites)
          : updatedRows,
      };
    });

    persistFavoriteDeltas(get().favoriteSymbols);
    saveFavoriteContext(normalized, context);
  },
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setIsLoading: (value) => set({ isLoading: value }),
  setMarketMessage: (value) => set({ marketMessage: value }),
  setSearchTerm: (term) =>
    set((state) => ({ filters: { ...state.filters, search: term } })),
  setDataSymbolOperation: (data) => set({ dataSymbolOperation: data }),

  /* ---------- REST snapshot ---------- */

  fetchMarket: async (marketKey: string) => {
    const version = get().requestVersion + 1;

    set({
      isLoading: true,
      requestVersion: version,
    });

    try {
      const normalizedMarket = toDashboardMarket(marketKey);
      const defaults = getDefaultSelectionForDashboardMarket(normalizedMarket);
      const scope = get().selectedScope ?? defaults.scope;
      const exchange = get().selectedExchange ?? defaults.exchange;
      const preferredSymbol = get().preferredSymbol;
      const favoriteSymbols = get().favoriteSymbols;

      if (!scope || !exchange) {
        throw new Error("Falta scope/exchange para consultar iTICK");
      }

      const query = new URLSearchParams({
        scope,
        market: toCanonicalMarket(normalizedMarket),
        exchange,
        limit: "10",
      });

      if (preferredSymbol) {
        query.set("symbol", preferredSymbol.toUpperCase());
      }

      const res = await fetch(
        `/api/itick/markets?${query.toString()}`,
        { cache: "no-store" }
      );
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: string }).error)
            : `Status ${res.status}`;
        throw new Error(detail);
      }

      const data = Array.isArray(payload)
        ? applyFavoriteOrder(payload as MarketQuote[], favoriteSymbols)
        : [];
      if (version !== get().requestVersion) return;

      const noDataPayload =
        payload && typeof payload === "object"
          ? (payload as { no_market_data?: boolean; message?: string })
          : null;

      set((state) => ({
        dataMarket: data,
        livePrices: hydratePricesFromRows(data, state.livePrices),
        isLoading: false,
        marketMessage: noDataPayload?.no_market_data
          ? noDataPayload.message ?? "Sin datos del mercado para esta seleccion"
          : null,
        selectedScope: scope,
        selectedExchange: exchange,
        selectedSymbol: data[0]?.symbol ?? null,
      }));
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("fetchMarket error:", e);
      set({
        isLoading: false,
        marketMessage: e instanceof Error ? e.message : "Error cargando mercado",
      });
    }
  },

  /* ---------- SSE stream ---------- */

  startMarketStream: (marketKey: string) => {
    const current = get().sseMarket;
    if (current === marketKey && esRef) return;

    get().stopMarketStream();
    set({ sseMarket: marketKey });

    openSSE(marketKey, (prices) => {
      // 1️⃣ Acumular precios
      priceBuffer = { ...priceBuffer, ...prices };

      // 2️⃣ Aplicar a UI solo cada APPLY_INTERVAL_MS
      if (!applyTimer) {
        applyTimer = setTimeout(() => {
          const buffered = priceBuffer;
          priceBuffer = {};
          applyTimer = null;

          set({ livePrices: { ...get().livePrices, ...buffered } });

          const updated = mergePrices(get().dataMarket, buffered);
          set({ dataMarket: updated });
        }, APPLY_INTERVAL_MS);
      }
    });

    if (typeof document !== "undefined") {
      const onVis = () => {
        if (document.visibilityState === "visible") {
          if (!esRef && get().sseMarket) {
            openSSE(get().sseMarket!, () => {});
          }
        } else {
          get().stopMarketStream();
        }
      };

      const anyWin = window as any;
      if (!anyWin.__market_vis_listener__) {
        document.addEventListener("visibilitychange", onVis);
        anyWin.__market_vis_listener__ = true;
      }
    }
  },

  stopMarketStream: () => {
    closeSSE();
    priceBuffer = {};
    clearTimeout(applyTimer);
    applyTimer = null;
    set({ sseMarket: null });
  },

  /* ---------- helpers ---------- */

  selectMarket: async (marketKey: string) => {
    set({
      selectedMarket: marketKey as MarketKey,
      preferredSymbol: null,
      marketMessage: null,
    });
    get().stopMarketStream();
    await get().fetchMarket(marketKey);
  },

  applyLivePrices: () => {
    const merged = mergePrices(get().dataMarket, get().livePrices);
    set((state) => ({
      dataMarket: merged,
      livePrices: hydratePricesFromRows(merged, state.livePrices),
    }));
  },

  startLocalPriceSimulation: () => {
    if (localSimTimer) return;

    localSimTimer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;

      const state = get();
      if (!state.dataMarket.length) return;

      const nextRows: MarketQuote[] = [];
      let changed = false;

      for (const row of state.dataMarket) {
        const shouldMove = Math.random() >= 0.25;
        if (!shouldMove) {
          nextRows.push(row);
          continue;
        }

        const nextRow = simulateRowQuote(row);
        changed = changed || nextRow !== row;
        nextRows.push(nextRow);
      }

      if (!changed) return;

      set((prev) => ({
        dataMarket: nextRows,
        livePrices: hydratePricesFromRows(nextRows, prev.livePrices),
      }));
    }, SIMULATION_INTERVAL_MS);
  },

  stopLocalPriceSimulation: () => {
    if (localSimTimer) {
      clearInterval(localSimTimer);
      localSimTimer = null;
    }
  },

  refreshSymbolQuote: async (symbol, context) => {
    const normalizedSymbol = String(symbol ?? "").trim().toUpperCase();
    if (!normalizedSymbol) return undefined;

    const state = get();
    const row = state.dataMarket.find(
      (item) => String(item.symbol ?? "").toUpperCase() === normalizedSymbol
    );
    const favoriteContext = getFavoriteContext(normalizedSymbol);

    let market = normalizeMarketKey(
      context?.market ??
        row?.market ??
        favoriteContext?.market ??
        state.selectedMarket ??
        inferMarketFromSymbol(normalizedSymbol)
    );
    if (!market || market === "favoritas") {
      market = inferMarketFromSymbol(normalizedSymbol);
    }
    const exchange = String(
      context?.exchange ??
        row?.source ??
        favoriteContext?.exchange ??
        state.selectedExchange ??
        ""
    )
      .trim()
      .toUpperCase();

    if (!market || !exchange) return undefined;

    const scope = resolveScopeByContext({
      market,
      exchange,
      selectedScope: context?.scope ?? state.selectedScope ?? null,
      favoriteScope: favoriteContext?.scope ?? null,
    });
    const canonicalMarket = toCanonicalMarket(toDashboardMarket(market));

    try {
      const query = new URLSearchParams({
        scope,
        market: canonicalMarket,
        exchange,
        limit: "1",
        symbol: normalizedSymbol,
      });

      const response = await fetch(`/api/itick/markets?${query.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(payload) || !payload.length) return undefined;

      const quote =
        (payload as MarketQuote[]).find(
          (item) => String(item.symbol ?? "").toUpperCase() === normalizedSymbol
        ) ?? (payload as MarketQuote[])[0];
      const price = Number(quote?.price);
      if (!Number.isFinite(price) || price <= 0) return undefined;

      set((prev) => {
        const updatedRows = prev.dataMarket.map((item) => {
          if (String(item.symbol ?? "").toUpperCase() !== normalizedSymbol) return item;
          const previousCloseRaw =
            Number(item.previousClose) > 0 ? Number(item.previousClose) : Number(item.price);
          const previousClose =
            Number.isFinite(previousCloseRaw) && previousCloseRaw > 0
              ? previousCloseRaw
              : price;
          const change = price - previousClose;
          const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

          return {
            ...item,
            ...quote,
            price,
            previousClose,
            change,
            changePercent,
            latestTradingDay:
              quote?.latestTradingDay && quote.latestTradingDay.length > 0
                ? quote.latestTradingDay
                : new Date().toISOString(),
          };
        });

        return {
          dataMarket: updatedRows,
          livePrices: { ...prev.livePrices, [normalizedSymbol]: price },
        };
      });

      return price;
    } catch (error) {
      console.error("[marketStore] refreshSymbolQuote error:", error);
      return undefined;
    }
  },

  getLivePrice: (symbol: string) => {
    const S = symbol?.toUpperCase?.() || symbol;
    const live = get().livePrices[S];
    if (typeof live === "number") return live;

    const row = get().dataMarket.find((q) =>
      [q.symbol, (q as any).ticker, (q as any).code]
        .map((x) => String(x || "").toUpperCase())
        .includes(S)
    );

    return typeof row?.price === "number" ? row.price : undefined;
  },
}));
