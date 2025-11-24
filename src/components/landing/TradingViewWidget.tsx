// src/components/landing/TradingViewWidget.tsx
"use client";

import { useEffect } from "react";

export default function TradingViewWidget() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      dateRange: "12M",
      showChart: true,
      locale: "es",
      width: "100%",
      height: "550",
      largeChartUrl: "",
      isTransparent: false,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      tabs: [
        {
          title: "Índices",
          symbols: [
            { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
            { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" },
            { s: "FOREXCOM:DJI", d: "Dow 30" },
          ],
        },
        {
          title: "Criptomonedas",
          symbols: [
            { s: "BINANCE:BTCUSDT", d: "Bitcoin" },
            { s: "BINANCE:ETHUSDT", d: "Ethereum" },
            { s: "BINANCE:SOLUSDT", d: "Solana" },
          ],
        },
      ],
    });
    document.getElementById("tradingview-widget")?.appendChild(script);
  }, []);

  return (
    <div
      id="tradingview-widget"
      className="rounded-2xl overflow-hidden shadow-md border border-border"
    />
  );
}
