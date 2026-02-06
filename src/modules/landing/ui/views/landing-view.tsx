// src/modules/landing/ui/views/landing-view.tsx
"use client";

import { useState, useEffect } from "react";
import MarketSection from "@/components/landing/MarketSection";
import { useRouter, useSearchParams } from "next/navigation";

const MARKET_KEY_MAP: Record<string, 
  "crypto" | "indices" | "acciones" | "commodities" | "fx" | "all"
> = {
  Cryptocurrency: "crypto",
  Indices: "indices",
  Stocks: "acciones",
  Commodities: "commodities",
  Currencies: "fx",
  ETFs: "all",
  Bonds: "all",
  Funds: "all",
};

// 🔹 Definición de mercados con botones internos y URLs dinámicas
const MARKETS = {
  Indices: {
    buttons: ["Majors", "Indices Futures", "Americas", "Europe", "Asia/Pacific", "Middle East", "Africa"],
    getUrl: (sub: string) => {
      const urls: Record<string, string> = {
        Majors: "https://api.investing.com/api/financialdata/assets/sml/74?fields-list=name,last,high,low,changeOneDay,changeOneDayPercent,time,isOpen,flag,url&country-id=5&limit=10",
        "Indices Futures": "https://api.investing.com/api/financialdata/assets/sml/75?fields-list=name,last,high,low,changeOneDay,changeOneDayPercent,time&limit=10",
        Americas: "https://api.investing.com/api/financialdata/assets/sml/76?limit=10",
        Europe: "https://api.investing.com/api/financialdata/assets/sml/77?limit=10",
        "Asia/Pacific": "https://api.investing.com/api/financialdata/assets/sml/78?limit=10",
        "Middle East": "https://api.investing.com/api/financialdata/assets/sml/79?limit=10",
        Africa: "https://api.investing.com/api/financialdata/assets/sml/80?limit=10",
      };
      return urls[sub] || urls.Majors;
    },
  },

  Stocks: {
    buttons: ["Trending Stocks", "Most Active", "Top Gainers", "Top Losers", "52 Week High", "52 Week Low", "Dow Jones", "S&P 500", "Nasdaq"],
    getUrl: (sub: string) => {
      const urls: Record<string, string> = {
        "Trending Stocks": "https://api.investing.com/api/financialdata/homepage/trending-stocks?limit=10",
        "Most Active": "https://api.investing.com/api/financialdata/homepage/most-active?limit=10",
        "Top Gainers": "https://api.investing.com/api/financialdata/homepage/top-gainers?limit=10",
        "Top Losers": "https://api.investing.com/api/financialdata/homepage/top-losers?limit=10",
      };
      return urls[sub] || urls["Trending Stocks"];
    },
  },

  Commodities: {
    buttons: ["Real Time Futures", "Metals", "Grains", "Softs", "Energy", "Meats"],
    getUrl: () =>
      `https://api.investing.com/api/financialdata/assets/list/8830,8836,8849,8831,8833,8862,8988,8916,8917,954867?fields-list=name,month,last,high,low,changeOneDay,changeOneDayPercent,time&limit=10`,
  },

  Currencies: {
    buttons: ["Majors", "Local"],
    getUrl: () =>
      `https://api.investing.com/api/financialdata/homepage/major-currencies?limit=10`,
  },

  ETFs: {
    buttons: ["Major ETFs", "Most Active", "Top Gainers", "Equities", "Bonds", "Commodities", "Currencies"],
    getUrl: () =>
      `https://api.investing.com/api/financialdata/assets/fundsByDomain/majorEtfs?fields-list=name,last,high,low,changeOneDay,changeOneDayPercent,volumeOneDay,time&limit=10`,
  },

  Bonds: {
    buttons: ["Majors"],
    getUrl: () =>
      `https://api.investing.com/api/financialdata/assets/pairsByScreen/6?fields-list=name,yield,prev,high,low,changeOneDay,changeOneDayPercent,time&limit=10`,
  },

  Funds: {
    buttons: ["Majors", "Equities", "Commodities", "Bonds"],
    getUrl: () =>
      `https://api.investing.com/api/financialdata/assets/fundsByDomain/major?fields-list=name,symbol,last,changeOneDay,changeOneDayPercent,time&limit=10`,
  },

  Cryptocurrency: {
    buttons: ["Majors", "Top Gainers", "Top Losers", "Stocks", "ETFs"],
    getUrl: () =>
      `https://api.investing.com/api/financialdata/homepage/major-cryptocurrencies?limit=10`,
  },
};

export default function LandingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMarket = (searchParams.get("market") as keyof typeof MARKETS) || "Indices";
  const [mainMarket, setMainMarket] = useState<keyof typeof MARKETS>(initialMarket);

  const marketConfig = MARKETS[mainMarket];

  // 🔹 Sincronizar con URL si cambia
  useEffect(() => {
    const marketFromParams = searchParams.get("market") as keyof typeof MARKETS;
    if (marketFromParams && marketFromParams !== mainMarket) {
      setMainMarket(marketFromParams);
    }
  }, [searchParams, mainMarket]);

  const formatNum = (val: unknown) =>
    val !== undefined && val !== null && !isNaN(Number(val)) ? Number(val).toFixed(2) : "-";

  const formatPct = (val: unknown) =>
    val !== undefined && val !== null && !isNaN(Number(val)) ? `${Number(val).toFixed(2)}%` : "-";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <header className="flex flex-col gap-2 justify-between mb-4">
            <h2 className="text-2xl font-semibold">Markets</h2>

            <div className="flex gap-2 flex-wrap">
              {Object.keys(MARKETS).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    router.push(`?market=${m}`);
                    setMainMarket(m as keyof typeof MARKETS);
                  }}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    m === mainMarket ? "bg-[var(--amarillo-principal)] text-black" : "bg-muted/30"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </header>

        <MarketSection
          title={MARKET_KEY_MAP[mainMarket]}
          renderRow={(item) => ({
            symbol: item.symbol,
            price: item.price,
            date: item.latestTradingDay,
          })}
          onMarketChange={() => {}}
        />

        </div>

        <aside className="lg:col-span-1 space-y-6">
          <section>
            <h3 className="text-sm font-semibold mb-2">Market Movers</h3>
            <div className="flex gap-3 text-xs mb-2 flex-wrap">
              <button className="text-[var(--amarillo-principal)] font-medium">Most Active</button>
              <button className="text-muted-foreground hover:text-[var(--amarillo-principal)]">Gainers</button>
              <button className="text-muted-foreground hover:text-[var(--amarillo-principal)]">Losers</button>
            </div>

            <ul className="space-y-1 text-sm">
              <li className="flex justify-between border-b py-1">
                <span>NVDA</span>
                <span>187.62</span>
                <span className="text-red-500">-0.67%</span>
                <span className="text-muted-foreground">137.60M</span>
              </li>
              <li className="flex justify-between border-b py-1">
                <span>TSLA</span>
                <span>429.83</span>
                <span className="text-red-500">-1.42%</span>
                <span className="text-muted-foreground">133.19M</span>
              </li>
              <li className="flex justify-between border-b py-1">
                <span>AAPL</span>
                <span>258.02</span>
                <span className="text-green-500">+0.35%</span>
                <span className="text-muted-foreground">85.60M</span>
              </li>
            </ul>
          </section>
        </aside>
      </main>

      <footer className="py-4 text-xs text-center text-muted border-t">
        © {new Date().getFullYear()} BitLance. Todos los derechos reservados.
      </footer>
    </div>
  );
}
