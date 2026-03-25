"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type AreaData,
  type Time,
  UTCTimestamp,
} from "lightweight-charts";
import { useMarketStore } from "@/stores/useMarketStore";
import exchangeMetaJson from "@/data/itick/exchange-meta.json";
import type { CandleData, ChartType, LoadMoreDirection } from "../types";
import { VALID_INTERVALS, validateInterval, getIntervalInSeconds } from "../utils/intervals";
import { getCached, setCached } from "../utils/cache";
import { formatPrice } from "../utils/format";
import { getFavoriteContext } from "@/lib/itick/favorites";

let isChartInitializing = false;

/* ===================== Throttle / Coalescing ===================== */
const MIN_FETCH_GAP_MS = 1200;  // evita golpear API muy seguido (soft)
const MIN_FORCE_GAP_MS = 800;   // evita golpear API muy seguido (force)
const MIN_HIST_GAP_MS = 1000;   // para historical loadMore

const inFlight = new Map<string, Promise<CandleData[]>>(); // coalescing normal
const inFlightHist = new Map<string, Promise<CandleData[]>>(); // coalescing historical

function keyOf(symbol: string, interval: string, force: boolean) {
  return `${symbol}::${interval}::${force ? "force" : "soft"}`;
}
function histKeyOf(symbol: string, interval: string, dir: "forward" | "backward") {
  return `HIST::${symbol}::${interval}::${dir}`;
}

type ExchangeMeta = Record<
  string,
  {
    scope?: string;
    region?: string;
    market?: string;
  }
>;

type CandleSelectionContext = {
  market: string;
  scope: string;
  exchange: string;
};

const exchangeMeta = exchangeMetaJson as ExchangeMeta;

function normalizeMarket(value: string | null | undefined) {
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

/* ===================== Hook ===================== */
export function useAlphaChart(initialInterval: string) {
  const {
    selectedSymbol,
    selectedMarket,
    selectedScope,
    selectedExchange,
    dataMarket,
  } =
    useMarketStore();

  // refs agrupadas
  const refs = useRef({
    container: null as HTMLDivElement | null,
    chart: null as IChartApi | null,
    series: null as ISeriesApi<"Candlestick" | "Line" | "Area"> | null,
    data: [] as CandleData[],
    interval: validateInterval(initialInterval),
    mounted: false,
    isInitialLoad: true,
    isLoading: false,
    isLoadingMore: null as LoadMoreDirection,
    loadMoreTimeout: null as NodeJS.Timeout | null,
    resizeTimeout: null as NodeJS.Timeout | null,
    lastLoad: { time: 0, dir: null as LoadMoreDirection },
    lastFetchAt: 0,
    lastHistAt: 0,
    requestSeq: 0,
    abort: null as AbortController | null,
    symbolReloadTimeout: null as NodeJS.Timeout | null,
    crosshairHandler: null as ((param: any) => void) | null,
    rangeHandler: null as (() => void) | null,
    lastRenderedKey: "",
  });

  // estado UI
  const [chartReady, setChartReady] = useState(false);
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState<LoadMoreDirection>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [isChangingSymbol, setIsChangingSymbol] = useState(false);
  const dismissError = useCallback(() => setError(null), []);

  const cancelActive = useCallback(() => {
    if (refs.current.abort) {
      refs.current.abort.abort();
      refs.current.abort = null;
    }
  }, []);

  const resolveCandleContext = useCallback(
    (symbol: string): CandleSelectionContext => {
      const upperSymbol = symbol.toUpperCase();
      const selectedRow = dataMarket.find(
        (row) => String(row.symbol ?? "").toUpperCase() === upperSymbol
      );
      const storedContext = getFavoriteContext(upperSymbol);

      const rowMarket = normalizeMarket(selectedRow?.market);
      const storedMarket = normalizeMarket(storedContext?.market);
      const selectedMarketNormalized = normalizeMarket(selectedMarket);

      const rowExchange =
        typeof selectedRow?.source === "string"
          ? selectedRow.source.trim().toUpperCase()
          : "";
      const storedExchange = String(storedContext?.exchange ?? "")
        .trim()
        .toUpperCase();

      const exchange = (
        [selectedExchange, rowExchange, storedExchange]
          .map((value) => String(value ?? "").trim().toUpperCase())
          .find(Boolean) ?? ""
      ).toUpperCase();
      const exchangeInfo = exchange ? exchangeMeta[exchange] : undefined;

      const exchangeMarket = normalizeMarket(exchangeInfo?.market);

      let market = selectedMarketNormalized;
      if (!market || market === "favoritas") {
        market =
          rowMarket ||
          storedMarket ||
          exchangeMarket ||
          inferMarketFromSymbol(upperSymbol);
      }
      if (market === "favoritas") {
        market = inferMarketFromSymbol(upperSymbol);
      }

      let scope = String(
        selectedScope ??
          storedContext?.scope ??
          exchangeInfo?.scope ??
          exchangeInfo?.region ??
          ""
      )
        .trim()
        .toUpperCase();

      if (!scope) {
        scope = market === "crypto" || market === "forex" ? "GLOBAL" : "US";
      }

      return {
        market,
        scope,
        exchange,
      };
    },
    [dataMarket, selectedExchange, selectedMarket, selectedScope]
  );

  const mergeNoDup = useCallback((a: CandleData[], b: CandleData[]) => {
    const m = new Map<number, CandleData>();
    a.forEach(c => m.set(c.time, c));
    b.forEach(c => m.set(c.time, c));
    return Array.from(m.values()).sort((x, y) => x.time - y.time);
  }, []);

  const createSeries = useCallback((candles: CandleData[]) => {
    const { chart, series } = refs.current;
    if (!chart || !candles.length) return null;

    if (series) {
      try { chart.removeSeries(series); } catch {}
      refs.current.series = null;
    }

    let s: ISeriesApi<"Candlestick" | "Line" | "Area">;
    if (chartType === "line") {
      s = chart.addLineSeries({ color: "#4fa3ff", lineWidth: 2 });
      s.setData(candles.map(c => ({ time: c.time, value: c.close } as LineData)));
    } else if (chartType === "area") {
      s = chart.addAreaSeries({
        lineColor: "#4fa3ff",
        topColor: "rgba(79,163,255,.4)",
        bottomColor: "rgba(79,163,255,.1)"
      });
      s.setData(candles.map(c => ({ time: c.time, value: c.close } as AreaData)));
    } else {
      s = chart.addCandlestickSeries({
        upColor: "#4caf50",
        downColor: "#f44336",
        borderVisible: false,
        wickUpColor: "#4caf50",
        wickDownColor: "#f44336",
      });
      s.setData(candles.map(c => ({
        time: c.time as Time,
        open: c.open, high: c.high, low: c.low, close: c.close
      } as CandlestickData<Time>)));
    }
    refs.current.series = s;
    return s;
  }, [chartType]);

  const updateSeries = useCallback((candles: CandleData[]) => {
    const s = refs.current.series;
    if (!s) return;
    try {
      if (chartType === "line") {
        (s as ISeriesApi<"Line">).setData(candles.map(c => ({ time: c.time, value: c.close } as LineData)));
      } else if (chartType === "area") {
        (s as ISeriesApi<"Area">).setData(candles.map(c => ({ time: c.time, value: c.close } as AreaData)));
      } else {
        (s as ISeriesApi<"Candlestick">).setData(candles.map(c => ({
          time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close
        } as CandlestickData<Time>)));
      }
    } catch {}
  }, [chartType]);

  const initChart = useCallback(() => {
    if (!refs.current.container || refs.current.chart || isChartInitializing) return;
    isChartInitializing = true;
    try {
      refs.current.container.innerHTML = "";
      const chart = createChart(refs.current.container, {
        layout: { background: { color: "#0b1d37" }, textColor: "#fff", fontFamily: "Arial, sans-serif" },
        grid: { vertLines: { color: "#1b2a4a" }, horzLines: { color: "#1b2a4a" } },
        width: refs.current.container.clientWidth,
        height: 500,
        timeScale: { borderColor: "#485c7b", timeVisible: true, secondsVisible: false, barSpacing: 8, minBarSpacing: 2 },
        crosshair: {
          mode: 1,
          vertLine: { color: "#dfc035", width: 1, style: 2, labelBackgroundColor: "#dfc035" },
          horzLine: { color: "#dfc035", width: 1, style: 2, labelBackgroundColor: "#dfc035" },
        },
        localization: { locale: "es-ES", dateFormat: "dd/MM/yyyy" },
      });
      refs.current.chart = chart;
      setChartReady(true);
      setError(null);
    } catch {
      setChartReady(false);
      setError("Error al inicializar el gráfico");
    } finally {
      isChartInitializing = false;
    }
  }, []);

  const cleanup = useCallback(() => {
    cancelActive();
    setChartReady(false);
    setCurrentPrice("");
    setCurrentTime("");
    setError(null);

    const { loadMoreTimeout, resizeTimeout, symbolReloadTimeout, series, chart } = refs.current;
    if (loadMoreTimeout) { clearTimeout(loadMoreTimeout); refs.current.loadMoreTimeout = null; }
    if (resizeTimeout) { clearTimeout(resizeTimeout); refs.current.resizeTimeout = null; }
    if (symbolReloadTimeout) { clearTimeout(symbolReloadTimeout); refs.current.symbolReloadTimeout = null; }
    if (series && chart) { try { chart.removeSeries(series); } catch {} refs.current.series = null; }
    if (chart) { try { chart.remove(); } catch {} refs.current.chart = null; }
    refs.current.crosshairHandler = null;
    refs.current.rangeHandler = null;
    isChartInitializing = false;
  }, [cancelActive]);

  /* ===================== Carga principal con SWR-lite + cooldown + coalescing ===================== */
  const load = useCallback(async (force = false): Promise<CandleData[]> => {
    const symbol = selectedSymbol || "";
    if (!symbol) return [];

    const { market, scope, exchange } = resolveCandleContext(symbol);
    const cacheSymbol = `${symbol}|${market}|${scope}|${exchange}`;
    const interval = refs.current.interval;

    const now = Date.now();
    const gap = now - refs.current.lastFetchAt;

    // 1) sirvo cache si existe y no es force
    const cached = getCached(cacheSymbol, interval);
    if (!force && cached) {
      refs.current.data = cached;

      // SWR-lite: si ya pasó un rato (20s), refresco en background
      // Refresh silencioso deshabilitado para evitar solicitudes redundantes.
      return cached;
    }

    // 2) cooldown
    if ((!force && gap < MIN_FETCH_GAP_MS) || (force && gap < MIN_FORCE_GAP_MS)) {
      return refs.current.data;
    }

    // 3) coalescing
    const inFlightKey = keyOf(cacheSymbol, interval, force);
    if (inFlight.has(inFlightKey)) {
      try { return await inFlight.get(inFlightKey)!; }
      catch { inFlight.delete(inFlightKey); }
    }

    cancelActive();
    const ac = new AbortController();
    refs.current.abort = ac;
    const requestId = ++refs.current.requestSeq;

    refs.current.isLoading = true;
    setIsLoading(true);
    setError(null);

    const promise = (async (): Promise<CandleData[]> => {
      try {
        const params = new URLSearchParams({ symbol, interval });
        if (market) params.set("market", market);
        if (scope) params.set("scope", scope);
        if (exchange) params.set("exchange", exchange);
        if (force) params.set("timestamp", String(Date.now()));

        const res = await fetch(`/api/alpha-candles?${params.toString()}`, { signal: ac.signal });
        if (ac.signal.aborted) return [];

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          if (res.status === 429) throw new Error(`Límite de API alcanzado. Intenta nuevamente en ${j.retryAfter ?? 60} segundos.`);
          if (res.status === 404) throw new Error("Símbolo no encontrado o sin datos disponibles.");
          throw new Error(j.error || `Error ${res.status} al cargar datos`);
        }

        const candles: CandleData[] = await res.json();
        const valid = candles.filter(c => c && typeof c.time === "number" && Number.isFinite(c.close));
        if (!valid.length) throw new Error("No se encontraron datos para este símbolo");

        if (requestId === refs.current.requestSeq) {
          setError(null);
        }
        refs.current.data = valid;
        setCached(cacheSymbol, interval, valid);
        refs.current.lastFetchAt = Date.now();

        return valid;
      } finally {
        inFlight.delete(inFlightKey);
      }
    })();

    inFlight.set(inFlightKey, promise);

    try {
      const data = await promise;
      return data;
    } catch (err: any) {
      if (err?.name === "AbortError") return [];
      if (requestId === refs.current.requestSeq) {
        setError(String(err?.message ?? "Error desconocido"));
      }
      const fallback = getCached(cacheSymbol, interval);
      if (fallback) {
        refs.current.data = fallback;
        if (requestId === refs.current.requestSeq) {
          setError(null);
        }
        return fallback;
      }
      return [];
    } finally {
      refs.current.isLoading = false;
      if (requestId === refs.current.requestSeq) {
        refs.current.abort = null;
        setIsLoading(false);
      }
    }
  }, [selectedSymbol, resolveCandleContext, cancelActive]);

  /* ===================== Carga histórica con cooldown + coalescing ===================== */
  const loadMore = useCallback(async (dir: Exclude<LoadMoreDirection, null>, refSecs: number) => {
    const now = Date.now();
    const { isLoadingMore, lastLoad, lastHistAt } = refs.current;

    // antipulsos previos + cooldown general historical
    if ((isLoadingMore && now - lastLoad.time < 1500 && lastLoad.dir === dir) || (now - lastHistAt < MIN_HIST_GAP_MS)) {
      return [];
    }

    // sanidad de timestamp (no en futuro +1 día)
    if (refSecs > Math.floor(Date.now() / 1000) + 86400) return [];

    const symbol = selectedSymbol || "";
    if (!symbol) return [];

    const { market, scope, exchange } = resolveCandleContext(symbol);
    const cacheSymbol = `${symbol}|${market}|${scope}|${exchange}`;
    const interval = refs.current.interval;

    // coalescing histórico (por dir)
    const inflKey = histKeyOf(cacheSymbol, interval, dir);
    if (inFlightHist.has(inflKey)) {
      try { return await inFlightHist.get(inflKey)!; }
      catch { inFlightHist.delete(inflKey); }
    }

    cancelActive();
    const ac = new AbortController();
    refs.current.abort = ac;

    refs.current.isLoadingMore = dir;
    refs.current.lastLoad = { time: now, dir };
    setLoadingMore(dir);

    const promise = (async (): Promise<CandleData[]> => {
      try {
        const params = new URLSearchParams({
          symbol,
          interval,
          historical: "true",
          direction: dir,
          referenceTime: String(Math.floor(refSecs)),
        });
        if (market) params.set("market", market);
        if (scope) params.set("scope", scope);
        if (exchange) params.set("exchange", exchange);

        const res = await fetch(`/api/alpha-candles?${params.toString()}`, { signal: ac.signal });
        if (ac.signal.aborted) return [];
        if (!res.ok) return [];

        const rows: CandleData[] = (await res.json()) || [];
        const filtered = rows.filter(c => c && typeof c.time === "number" && Number.isFinite(c.close));
        refs.current.lastHistAt = Date.now();
        return filtered;
      } finally {
        inFlightHist.delete(inflKey);
      }
    })();

    inFlightHist.set(inflKey, promise);

    try {
      return await promise;
    } catch {
      return [];
    } finally {
      refs.current.isLoadingMore = null;
      refs.current.lastLoad = { time: Date.now(), dir: null };
      refs.current.abort = null;
      setLoadingMore(null);
    }
  }, [selectedSymbol, resolveCandleContext, cancelActive]);

  /* ===================== Render serie =====================
    🔧 FIX: Se agregó verificación de refs.current.chart antes de acceder
    a chart.timeScale(), especialmente dentro de callbacks y timeouts,
    evitando TypeError cuando el chart se vuelve null tras cleanup()
    (cambio de símbolo, unmount o reinicialización del gráfico).
  ========================================================== */
  const renderSeries = useCallback(async (force = false) => {
    const chart = refs.current.chart;
    if (!chart) return;
    const resolved = selectedSymbol
      ? resolveCandleContext(selectedSymbol)
      : { market: selectedMarket ?? "", scope: selectedScope ?? "", exchange: selectedExchange ?? "" };
    const cacheSymbol = `${selectedSymbol || ""}|${resolved.market}|${resolved.scope}|${
      resolved.exchange
    }`;

    const candles = await load(force);
    if (!candles.length) {
      return;
    }
    setError(null);

    const s = createSeries(candles);
    if (!s) return;

    // 🔐 Re-leer chart por si algo cambió mientras cargábamos
    const chartAfterCreate = refs.current.chart;
    if (!chartAfterCreate) return;

    const tsInit = chartAfterCreate.timeScale();
    const total = candles.length;
    if (total) {
      const last = candles[total - 1].time as Time;
      const first = candles[Math.max(0, total - Math.min(100, total))].time as Time;
      tsInit.setVisibleRange({ from: first, to: last });
    }
    refs.current.isInitialLoad = false;

    // crosshair (suscripción simple; lightweight-charts ignora subs duplicadas iguales)
    if (refs.current.crosshairHandler) {
      chartAfterCreate.unsubscribeCrosshairMove(refs.current.crosshairHandler);
      refs.current.crosshairHandler = null;
    }

    const crosshairHandler = (param: any) => {
      const seriesRef = refs.current.series;
      if (!seriesRef) {
        setCurrentPrice("");
        setCurrentTime("");
        return;
      }

      const d = param?.seriesData.get(seriesRef);
      if (!d) {
        setCurrentPrice("");
        setCurrentTime("");
        return;
      }

      let price: number | undefined;
      if ("value" in d && typeof d.value === "number") price = d.value;
      else if ("close" in d && typeof d.close === "number") price = d.close;
      else {
        setCurrentPrice("");
        setCurrentTime("");
        return;
      }

      const time = "time" in d && d.time ? d.time : param.time;
      if (!price || !time) return;

      setCurrentPrice(formatPrice(price, selectedSymbol));
      const date = new Date((time as number) * 1000);
      setCurrentTime(
        date.toLocaleString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    chartAfterCreate.subscribeCrosshairMove(crosshairHandler);
    refs.current.crosshairHandler = crosshairHandler;

    // lazy-load en bordes
    const onRange = () => {
      // ⛔ si el chart ya no existe (cleanup, cambio de símbolo, etc.), no hacemos nada
      if (!refs.current.chart) return;

      if (refs.current.loadMoreTimeout) {
        clearTimeout(refs.current.loadMoreTimeout);
      }

      refs.current.loadMoreTimeout = setTimeout(async () => {
        const chartForRange = refs.current.chart;
        if (!chartForRange) return;

        const ts = chartForRange.timeScale();
        const vr = ts.getVisibleRange();
        if (!vr) return;

        const data = refs.current.data;
        if (!data.length || refs.current.isLoadingMore || refs.current.isLoading) return;

        const earliest = data[0].time;
        const latest = data[data.length - 1].time;
        const buf = getIntervalInSeconds(refs.current.interval) * 8;

        if (Number(vr.from) <= earliest + buf) {
          const hist = await loadMore("backward", earliest);
          if (hist.length) {
            const merged = mergeNoDup(hist, data);
            refs.current.data = merged;
            updateSeries(merged);
            setCached(cacheSymbol, refs.current.interval, merged);
          }
        }

        if (Number(vr.to) >= latest - buf) {
          const fwd = await loadMore("forward", latest);
          if (fwd.length) {
            const merged = mergeNoDup(data, fwd);
            refs.current.data = merged;
            updateSeries(merged);
            setCached(cacheSymbol, refs.current.interval, merged);
          }
        }
      }, 300);
    };

    // 🔐 Volvemos a comprobar que el chart siga existiendo antes de suscribir
    const chartForSubs = refs.current.chart;
    if (!chartForSubs) return;

    const tsSubs = chartForSubs.timeScale();
    if (refs.current.rangeHandler) {
      tsSubs.unsubscribeVisibleTimeRangeChange(refs.current.rangeHandler);
      tsSubs.unsubscribeSizeChange(refs.current.rangeHandler);
      refs.current.rangeHandler = null;
    }
    tsSubs.subscribeVisibleTimeRangeChange(onRange);
    tsSubs.subscribeSizeChange(onRange);
    refs.current.rangeHandler = onRange;
  }, [load, createSeries, updateSeries, mergeNoDup, loadMore, selectedSymbol, selectedMarket, selectedScope, selectedExchange, resolveCandleContext]);

  /* ===================== Zoom ===================== */
  const zoom = useCallback((dir: "in" | "out" | "reset") => {
    const chart = refs.current.chart;
    if (!chart) return;
    const ts = chart.timeScale();
    if (dir === "reset") { ts.fitContent(); return; }
    const r = ts.getVisibleRange(); if (!r) return;
    const factor = dir === "in" ? 0.2 : -0.2;
    const delta = (Number(r.to) - Number(r.from)) * factor;
    ts.setVisibleRange({
      from: (Number(r.from) + delta) as UTCTimestamp,
      to: (Number(r.to) - delta) as UTCTimestamp
    });
  }, []);

  /* ===================== Handlers interval/type ===================== */
  const changeInterval = useCallback((v: string) => {
    refs.current.interval = validateInterval(v);
    refs.current.isInitialLoad = true;
    renderSeries(true);
  }, [renderSeries]);

  const changeType = useCallback((v: ChartType) => {
    setChartType(v);
    if (refs.current.data.length) createSeries(refs.current.data);
  }, [createSeries]);

  /* ===================== Efectos base ===================== */
  useEffect(() => {
    if (refs.current.mounted) return;
    refs.current.mounted = true;
    initChart();
    return () => { refs.current.mounted = false; cleanup(); };
  }, [initChart, cleanup]);

  useEffect(() => {
    if (chartReady && refs.current.data.length && !refs.current.isInitialLoad) {
      createSeries(refs.current.data);
    }
  }, [chartType, chartReady, createSeries]);

  /* ===================== Resize (ResizeObserver + rAF) ===================== */
  useEffect(() => {
    if (!chartReady) return;

    const el = refs.current.container;
    const chart = refs.current.chart;
    if (!el || !chart) return;

    let frame = 0;
    let initFrame = 0;

    const resizeNow = () => {
      const c = refs.current.chart;
      const container = refs.current.container;
      if (!c || !container) return;

      const w = container.clientWidth || 0;
      const h = container.clientHeight || 500;

      if (w > 0) {
        try {
          if (typeof (c as any).resize === "function") {
            (c as any).resize(w, h);
          } else {
            c.applyOptions({ width: w, height: h });
          }
        } catch {}
      }
    };

    const ro = new ResizeObserver(() => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resizeNow);
    });

    ro.observe(el);
    initFrame = requestAnimationFrame(resizeNow);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (initFrame) cancelAnimationFrame(initFrame);
      ro.disconnect();
    };
  }, [chartReady]);

  const selectedContextKey = useMemo(() => {
    if (!selectedSymbol) return "";
    const ctx = resolveCandleContext(selectedSymbol);
    return `${selectedSymbol}|${ctx.market}|${ctx.scope}|${ctx.exchange}`;
  }, [selectedSymbol, resolveCandleContext]);

  /* ===================== Cambio de símbolo / intervalo inicial ===================== */
  useEffect(() => {
    if (!selectedSymbol || !selectedContextKey) {
      refs.current.lastRenderedKey = "";
      return;
    }
    if (refs.current.symbolReloadTimeout) {
      clearTimeout(refs.current.symbolReloadTimeout);
      refs.current.symbolReloadTimeout = null;
    }

    refs.current.symbolReloadTimeout = setTimeout(() => {
      void (async () => {
        const renderKey = `${selectedContextKey}|${validateInterval(initialInterval)}`;
        if (
          refs.current.lastRenderedKey === renderKey &&
          refs.current.data.length > 0 &&
          refs.current.series
        ) return;

        setIsChangingSymbol(true);
        try {
        cleanup();
        refs.current.data = [];
        refs.current.interval = validateInterval(initialInterval);
        refs.current.isInitialLoad = true;
        setError(null);
        setCurrentPrice("");
        setCurrentTime("");

      // pequeña pausa para desmontar DOM del chart y evitar carreras
          await new Promise((r) => setTimeout(r, 140));
          initChart();

          const wait = () =>
            new Promise<void>((resolve) => {
              const tick = () => (refs.current.chart ? resolve() : setTimeout(tick, 40));
              tick();
            });
          await wait();

          await renderSeries(true);
          if (refs.current.data.length > 0 && refs.current.series) {
            refs.current.lastRenderedKey = renderKey;
          } else {
            refs.current.lastRenderedKey = "";
          }
        } catch {
          refs.current.lastRenderedKey = "";
        } finally {
          setIsChangingSymbol(false);
        }
      })();
    }, 120);

    return () => {
      if (refs.current.symbolReloadTimeout) {
        clearTimeout(refs.current.symbolReloadTimeout);
        refs.current.symbolReloadTimeout = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol, selectedContextKey, initialInterval]);

  /* ===================== Retorno ===================== */
  return {
    refs,
    VALID_INTERVALS,
    state: {
      chartReady,
      chartType,
      isLoading,
      loadingMore,
      error,
      currentPrice,
      currentTime,
      isChangingSymbol,
      selectedSymbol,
      currentInterval: refs.current.interval,
    },
    actions: {
      changeInterval,
      changeType,
      zoom,
      refresh: () => renderSeries(true),
      dismissError,
    },
  };
}
