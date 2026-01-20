// src/stores/useMarketStore.ts
import { MARKETS } from "@/lib/markets";
import { MarketQuote } from "@/types/interfaces";
import { create } from "zustand";

/* ===================== Tipos ===================== */

export interface MarketFilters {
  search: string;
  sortBy: "price" | "change" | "volume" | null;
}

type Market = (typeof MARKETS)[number];
type Prices = Record<string, number>;

interface MarketState {
  markets: Market[];
  dataMarket: MarketQuote[];
  selectedMarket: Market | null;
  selectedSymbol: string | null;
  filters: MarketFilters;
  isLoading: boolean;
  dataSymbolOperation: MarketQuote | null;
  livePrices: Prices;
  sseMarket: string | null;
  switchingMarket: boolean;
  fetchController: AbortController | null;
  requestVersion: number;

  setDataMarket: (markets: MarketQuote[]) => void;
  setSelectedMarket: (market: Market | null) => void;
  setSelectedSymbol: (symbol: string | null) => void;
  setFilters: (filters: Partial<MarketFilters>) => void;
  setIsLoading: (value: boolean) => void;
  setSearchTerm: (term: string) => void;
  setDataSymbolOperation: (data: MarketQuote) => void;

  fetchMarket: (marketKey: string) => Promise<void>;
  startMarketStream: (marketKey: string) => void;
  stopMarketStream: () => void;
  selectMarket: (marketKey: string) => Promise<void>;
  applyLivePrices: () => void;
  getLivePrice: (symbol: string) => number | undefined;
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

/* ===================== Store ===================== */

export const useMarketStore = create<MarketState>((set, get) => ({
  markets: [...MARKETS],
  dataMarket: [],
  selectedMarket: null,
  selectedSymbol: null,
  filters: { search: "", sortBy: null },
  isLoading: false,
  dataSymbolOperation: null,
  livePrices: {},
  sseMarket: null,
  switchingMarket: false,
  fetchController: null,
  requestVersion: 0,

  /* ---------- setters ---------- */

  setDataMarket: (dataMarket) => set({ dataMarket }),
  setSelectedMarket: (market) => set({ selectedMarket: market }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setIsLoading: (value) => set({ isLoading: value }),
  setSearchTerm: (term) =>
    set((state) => ({ filters: { ...state.filters, search: term } })),
  setDataSymbolOperation: (data) => set({ dataSymbolOperation: data }),

  /* ---------- REST snapshot ---------- */

  fetchMarket: async (marketKey: string) => {
    const prev = get().fetchController;
    prev?.abort();

    const version = get().requestVersion + 1;
    const controller = new AbortController();

    set({
      isLoading: true,
      fetchController: controller,
      requestVersion: version,
    });

    try {
      const res = await fetch(
        `/api/markets?market=${encodeURIComponent(marketKey)}`,
        { cache: "no-store", signal: controller.signal }
      );
      if (!res.ok) throw new Error(`Status ${res.status}`);

      const data: MarketQuote[] = await res.json();
      if (version !== get().requestVersion) return;

      set({
        dataMarket: data,
        isLoading: false,
        selectedSymbol: data[0]?.symbol ?? null,
      });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("fetchMarket error:", e);
      set({ isLoading: false });
    } finally {
      if (version === get().requestVersion) {
        set({ fetchController: null });
      }
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
    set({ selectedMarket: marketKey as Market });
    get().stopMarketStream();
    await get().fetchMarket(marketKey);
  },

  applyLivePrices: () => {
    const merged = mergePrices(get().dataMarket, get().livePrices);
    set({ dataMarket: merged });
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
