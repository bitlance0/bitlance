// src/components/TradingDashboard.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useMarketStore, type MarketKey } from "@/stores/useMarketStore";
import type { MarketQuote } from "@/types/interfaces";
import {
  toCanonicalMarket,
  getAvailableDashboardMarkets,
  getDefaultSelectionForDashboardMarket,
  getExchangesForDashboardMarket,
  getRegionsForDashboardMarket,
} from "@/lib/itick/dashboardMarketHelpers";
import {
  applyFavoriteOrder,
  ITICK_MAX_FAVORITES,
  resolveFavoriteContextMapFromStorage,
} from "@/lib/itick/favorites";

const TradingDashboardDesktop = dynamic(
  () => import("./trading-dashboard/TradingDashboardDesktop"),
  { ssr: false }
);

const TradingDashboardMobile = dynamic(
  () => import("./trading-dashboard/mobile/TradingDashboardMobile"),
  { ssr: false }
);

export default function TradingDashboard() {
  const [isMobile, setIsMobile] = useState(false);
  const availableMarkets = useMemo(() => getAvailableDashboardMarkets(), []);

  useEffect(() => {
    const checkViewport = () => {
      const isZoomed = window.devicePixelRatio >= 1.5;
      const isSmallWidth = window.innerWidth <= 850;
      setIsMobile(isZoomed || isSmallWidth);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  const {
    selectedSymbol,
    setSelectedSymbol,
    selectedMarket,
    setSelectedMarket,
    selectedScope,
    setSelectedScope,
    selectedExchange,
    setSelectedExchange,
    preferredSymbol,
    favoriteSymbols,
    setDataMarket,
    setIsLoading,
    setMarketMessage,
    startLocalPriceSimulation,
    stopLocalPriceSimulation,
  } = useMarketStore();

  const selectedSymbolRef = useRef<string | null>(selectedSymbol);
  const favoriteSymbolsRef = useRef<string[]>(favoriteSymbols);

  useEffect(() => {
    selectedSymbolRef.current = selectedSymbol;
  }, [selectedSymbol]);

  useEffect(() => {
    favoriteSymbolsRef.current = favoriteSymbols;
  }, [favoriteSymbols]);

  const effectiveMarket = useMemo(() => {
    if (!selectedMarket) return null;
    return availableMarkets.includes(selectedMarket as MarketKey)
      ? (selectedMarket as MarketKey)
      : null;
  }, [availableMarkets, selectedMarket]);

  useEffect(() => {
    if (effectiveMarket) return;
    const defaultMarket = (availableMarkets[0] ?? "indices") as MarketKey;
    const defaults = getDefaultSelectionForDashboardMarket(defaultMarket);
    setSelectedMarket(defaultMarket);
    setSelectedScope(defaults.scope);
    setSelectedExchange(defaults.exchange);
  }, [
    availableMarkets,
    effectiveMarket,
    setSelectedExchange,
    setSelectedMarket,
    setSelectedScope,
  ]);

  useEffect(() => {
    if (!effectiveMarket) return;
    const regions = getRegionsForDashboardMarket(effectiveMarket);
    if (!regions.length) {
      if (effectiveMarket === "favoritas") {
        if (selectedScope !== null) setSelectedScope(null);
        if (selectedExchange !== null) setSelectedExchange(null);
      }
      return;
    }

    if (!selectedScope || !regions.includes(selectedScope)) {
      const nextScope = regions[0];
      const exchanges = getExchangesForDashboardMarket(effectiveMarket, nextScope);
      setSelectedScope(nextScope);
      setSelectedExchange(exchanges[0] ?? null);
      return;
    }

    const exchanges = getExchangesForDashboardMarket(effectiveMarket, selectedScope);
    if (!selectedExchange || !exchanges.includes(selectedExchange)) {
      setSelectedExchange(exchanges[0] ?? null);
    }
  }, [
    effectiveMarket,
    selectedScope,
    selectedExchange,
    setSelectedScope,
    setSelectedExchange,
  ]);

  const loadData = useCallback(
    async (params: {
      market: MarketKey;
      scope: string | null;
      exchange: string | null;
      symbol: string | null;
    }) => {
      const { market, scope, exchange, symbol } = params;
      if (!market) return;

      setIsLoading(true);

      try {
        const currentFavorites = favoriteSymbolsRef.current;
        const currentSelectedSymbol = selectedSymbolRef.current;

        if (market === "favoritas") {
          const favoriteLimit = Math.min(currentFavorites.length, ITICK_MAX_FAVORITES);
          if (!favoriteLimit) {
            setDataMarket([]);
            setMarketMessage("Sin datos para favoritos");
            return;
          }

          const favoriteParam = currentFavorites.slice(0, favoriteLimit).join(",");
          const contextMap = resolveFavoriteContextMapFromStorage();
          const contextPayload = currentFavorites
            .slice(0, favoriteLimit)
            .reduce<Record<string, { market?: string | null; exchange?: string | null; scope?: string | null }>>(
              (acc, symbol) => {
                const context = contextMap[symbol];
                if (!context) return acc;
                acc[symbol] = context;
                return acc;
              },
              {}
            );
          const contextsParam =
            Object.keys(contextPayload).length > 0
              ? `&contexts=${encodeURIComponent(JSON.stringify(contextPayload))}`
              : "";

          const res = await fetch(
            `/api/itick/favorites?limit=${favoriteLimit}&chunk=3&symbols=${encodeURIComponent(
              favoriteParam
            )}${contextsParam}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

          const payload = await res.json().catch(() => null);
          if (!res.ok) {
            const detail =
              payload && typeof payload === "object" && "error" in payload
                ? String((payload as { error?: string }).error)
                : `HTTP ${res.status}`;
            throw new Error(detail);
          }

          const rows = Array.isArray(payload)
            ? applyFavoriteOrder(payload as MarketQuote[], currentFavorites)
            : [];
          setDataMarket(rows);
          setMarketMessage(rows.length ? null : "Sin datos para favoritos");

          if (rows.length) {
            if (!currentSelectedSymbol) {
              setSelectedSymbol(rows[0].symbol);
            } else if (
              !rows.some(
                (item) =>
                  item.symbol?.toUpperCase() === currentSelectedSymbol.toUpperCase()
              )
            ) {
              setSelectedSymbol(rows[0].symbol);
            }
          }
          return;
        }

        if (!scope || !exchange) return;

        const query = new URLSearchParams({
          scope,
          market: toCanonicalMarket(market),
          exchange,
          limit: "10",
        });

        if (symbol) {
          query.set("symbol", symbol.toUpperCase());
        }

        const res = await fetch(`/api/itick/markets?${query.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          const detail =
            payload && typeof payload === "object" && "error" in payload
              ? String((payload as { error?: string }).error)
              : `HTTP ${res.status}`;
          throw new Error(detail);
        }

        if (Array.isArray(payload)) {
          const rows = applyFavoriteOrder(payload as MarketQuote[], currentFavorites);
          setDataMarket(rows);
          setMarketMessage(null);

          if (!rows.length) return;

          const preferred = symbol?.toUpperCase() ?? null;
          const preferredExists = preferred
            ? rows.some((item) => item.symbol?.toUpperCase() === preferred)
            : false;

          if (preferredExists && preferred) {
            setSelectedSymbol(preferred);
            return;
          }

          if (!currentSelectedSymbol) {
            setSelectedSymbol(rows[0].symbol);
            return;
          }

          const currentExists = rows.some(
            (item) =>
              item.symbol?.toUpperCase() === currentSelectedSymbol.toUpperCase()
          );
          if (!currentExists) {
            setSelectedSymbol(rows[0].symbol);
          }
          return;
        }

        const noDataPayload =
          payload && typeof payload === "object"
            ? (payload as { no_market_data?: boolean; message?: string })
            : null;

        if (noDataPayload?.no_market_data) {
          setDataMarket([]);
          setMarketMessage(
            noDataPayload.message ?? "Sin datos del mercado para esta seleccion"
          );
          return;
        }

        setDataMarket([]);
        setMarketMessage("Respuesta no valida del proveedor iTICK");
      } catch (error) {
        console.error("Failed to load market data:", error);
        setDataMarket([]);
        setMarketMessage(
          error instanceof Error ? error.message : "Error consultando iTICK"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      setDataMarket,
      setIsLoading,
      setMarketMessage,
      setSelectedSymbol,
    ]
  );

  useEffect(() => {
    startLocalPriceSimulation();
    return () => stopLocalPriceSimulation();
  }, [startLocalPriceSimulation, stopLocalPriceSimulation]);

  useEffect(() => {
    if (!effectiveMarket) return;

    if (effectiveMarket !== "favoritas" && (!selectedScope || !selectedExchange)) {
      return;
    }

    loadData({
      market: effectiveMarket,
      scope: selectedScope,
      exchange: selectedExchange,
      symbol: preferredSymbol,
    });
  }, [effectiveMarket, selectedScope, selectedExchange, preferredSymbol, loadData]);

  return (
    <div className="w-full h-full">
      {isMobile ? <TradingDashboardMobile /> : <TradingDashboardDesktop />}
    </div>
  );
}
