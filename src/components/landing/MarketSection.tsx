// src/components/landing/MarketSection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useCachedFetch from "@/hooks/useCachedFetch";
import DataTableMarket from "@/components/market/DataTableMarket";
import { MARKETS, MarketKey } from "@/lib/marketsLanding";
import type {
  MarketItem,
  RenderedMarketRow,
} from "@/lib/marketTypes";



interface MarketSectionProps {
  title: MarketKey;
  renderRow: (item: MarketItem) => RenderedMarketRow;
  onMarketChange: (market: MarketKey) => void;
}

export default function MarketSection({
  title,
  renderRow,
  onMarketChange,
}: MarketSectionProps) {
  const searchParams = useSearchParams();
  const [market, setMarket] = useState<MarketKey>(title);

  

  // 🔁 sync por props
  useEffect(() => {
    setMarket(title);
  }, [title]);

  // 🔁 sync por URL
  useEffect(() => {
    const marketParam = searchParams.get("market") as MarketKey | null;
    if (marketParam && marketParam in MARKETS) {
      setMarket(marketParam);
      onMarketChange(marketParam);
    }
  }, [searchParams, onMarketChange]);

  // ✅ API limpia y tipada
  const apiUrl = useMemo(() => {
    return `/api/markets?market=${market}`;
  }, [market]);

  const { data, loading, error, lastUpdated } = useCachedFetch(apiUrl, [market]);

  useEffect(() => {
    console.log("API DATA:", data);
  }, [data]);

  const rows = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      ...renderRow(item),
      latestTradingDay: item.latestTradingDay,
      market: market,
    }));
  }, [data, renderRow, market]);

  useEffect(() => {
    console.log("ROWS:", rows);
  }, [rows]);

  return (
    <section className="px-4 md:px-12 py-8">
      {/* 🔹 BOTONES */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(MARKETS) as MarketKey[]).map((key) => (
          <button
            key={key}
            onClick={() => {
              setMarket(key);
              onMarketChange(key);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              market === key
                ? "bg-yellow-400 text-black"
                : "bg-gray-800 text-yellow-300 hover:bg-gray-700"
            }`}
          >
            {MARKETS[key].label}
          </button>
        ))}
      </div>

      <DataTableMarket
        rows={rows}
        market={market}
        loading={loading}
        error={error}
      />
    </section>
  );
}
