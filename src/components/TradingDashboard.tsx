// src/components/TradingDashboard.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { useMarketStore } from "@/stores/useMarketStore";
import { MARKETS } from "@/lib/markets";

const TradingDashboardDesktop = dynamic(
  () => import("./trading-dashboard/TradingDashboardDesktop"),
  { ssr: false }
);

const TradingDashboardMobile = dynamic(
  () => import("./trading-dashboard/mobile/TradingDashboardMobile"),
  { ssr: false }
);

type Market = (typeof MARKETS)[number] | "indices" | "all";

export default function TradingDashboard() {
  const [isMobile, setIsMobile] = useState(false);

  const {
    selectedSymbol,
    setSelectedSymbol,
    selectedMarket,
    setDataMarket,
    // 👇 usamos también el stream de mercados del store
    startMarketStream,
    stopMarketStream,
  } = useMarketStore();

  /** 🔹 Carga REST desde /api/markets (snapshot) */
  const loadData = useCallback(
    async (market: Market) => {
      if (!market) return;

      const resolvedMarket =
        !market || market === "all" ? "indices" : market;

      try {
        const controller = new AbortController();
        const res = await fetch(
          `/api/markets?market=${encodeURIComponent(resolvedMarket)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!res.ok) throw new Error(`Status ${res.status}`);

        const data = await res.json();

        // Snapshot al store
        setDataMarket(data);

        // Mantener/ajustar símbolo seleccionado
        if (!selectedSymbol && data.length > 0) {
          setSelectedSymbol(data[0].symbol);
        } else if (selectedSymbol) {
          const stillExists = data.some(
            (item: any) => item.symbol === selectedSymbol
          );
          if (!stillExists && data.length > 0) {
            setSelectedSymbol(data[0].symbol);
          }
        }
      } catch (error) {
        console.error("Failed to load market data:", error);
        setDataMarket([]);
      }
    },
    [setDataMarket, setSelectedSymbol, selectedSymbol]
  );

  /** 🔁 Polling REST: snapshot inmediato y luego cada 20s */
  useEffect(() => {
    const marketToFetch: Market =
      !selectedMarket || selectedMarket === "all"
        ? "indices"
        : selectedMarket;

    // Primera carga inmediata
    loadData(marketToFetch);

    // Polling cada 20 segundos
    const intervalId = setInterval(() => {
      loadData(marketToFetch);
    }, 20_000);

    return () => {
      clearInterval(intervalId);
    };
  }, [selectedMarket, loadData]);


  /** 🔴 SSE: arranca el stream 2s después de cambiar de mercado */
  useEffect(() => {
    const marketToStream: Market =
      !selectedMarket || selectedMarket === "all"
        ? "indices"
        : selectedMarket;

    if (!marketToStream) return;

    // esperamos 2s antes de iniciar el stream
    const timeoutId = setTimeout(() => {
      startMarketStream(marketToStream);
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      stopMarketStream();
    };
  }, [selectedMarket, startMarketStream, stopMarketStream]);


  /** 📱 Detección de mobile */
  useEffect(() => {
    const checkViewport = () => setIsMobile(window.innerWidth <= 850);
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  return (
    <div className="w-full h-full">
      {isMobile ? <TradingDashboardMobile /> : <TradingDashboardDesktop />}
    </div>
  );
}
