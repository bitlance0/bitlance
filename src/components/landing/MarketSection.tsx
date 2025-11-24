// src/components/landing/MarketSection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {useSearchParams } from "next/navigation";
import useCachedFetch from "@/hooks/useCachedFetch";
import DataTableMarket from "@/components/market/DataTableMarket";
import { MARKETS } from "@/config/markets";

// 🔹 Define las interfaces de props
interface MarketItem {
  Name?: string;
  Symbol?: string;
  Last?: number | string;
  High?: number | string;
  Low?: number | string;
  Chg?: number | string;
  ChgPct?: number | string;
  Time?: string;
  Url?: string;
}

interface RenderedMarketRow {
  name: string;
  last: string | number;
  high: string | number;
  low: string | number;
  chg: string | number;
  chgPct: string | number;
  time: string;
  url: string;
}

interface MarketSectionProps {
  title: keyof typeof MARKETS;
  buttons: string[];
  getUrl: () => string;
  renderRow: (item: MarketItem) => RenderedMarketRow;
  onMarketChange: (market: keyof typeof MARKETS) => void;
}

function formatNumber(num: unknown, decimals = 2) {
  if (num === undefined || num === null) return "-";
  
  // Si es string, quitar comas
  let n: number;
  if (typeof num === "string") {
    n = Number(num.replace(/,/g, ""));
  } else {
    n = Number(num);
  }
  if (isNaN(n)) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: n % 1 !== 0 ? decimals : 0,
    maximumFractionDigits: decimals,
  }).format(n);
}

export default function MarketSection({ 
  title, 
  buttons, 
  // getUrl = () => "", 
  renderRow, 
  onMarketChange 
}: MarketSectionProps) {
  const searchParams = useSearchParams();

  // ✅ Usa el title como valor inicial para market
  const [market, setMarket] = useState<keyof typeof MARKETS>(title);
  const [subMarket, setSubMarket] = useState(buttons[0]);

  // ✅ Sincroniza cuando cambian las props o searchParams
  useEffect(() => {
    setMarket(title);
    setSubMarket(buttons[0]);
  }, [title, buttons]);

  useEffect(() => {
    const marketParam = searchParams.get("market") as keyof typeof MARKETS | null;
    const subParam = searchParams.get("sub");

    if (marketParam && MARKETS[marketParam]) {
      setMarket(marketParam);
      // ✅ Notifica el cambio al componente padre
      onMarketChange(marketParam);
      
      // ✅ Evita error si el subParam no pertenece al nuevo market
      const validSub = MARKETS[marketParam].buttons.includes(subParam || "")
        ? subParam
        : MARKETS[marketParam].buttons[0];
      setSubMarket(validSub || buttons[0]);
    }
  }, [searchParams, onMarketChange, buttons]);

  const apiUrl = useMemo(() => {
    const base = `/api/markets?market=${market}&from=landing`;
    return subMarket ? `${base}&sub=${encodeURIComponent(subMarket)}` : base;
  }, [market, subMarket]);

  // Fetch data con hook cacheado
  const { data, loading, error, lastUpdated } = useCachedFetch(
    apiUrl,
    [market, subMarket]
  );

  // Formateo de filas usando la función renderRow proporcionada por props
  const rows = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: Record<string, unknown>) => {
      // Usa la función renderRow proporcionada por props
      const renderedRow = renderRow(item);
      
      // Normalizamos keys a minúsculas para datos adicionales
      const normalized: Record<string, unknown> = {};
      Object.entries(item).forEach(([k, v]) => {
        normalized[k.toLowerCase()] = v;
      });

    return {
      ...renderedRow,
      month: typeof normalized.month === 'string' || typeof normalized.month === 'number' ? normalized.month : "-",
      bid: normalized.bid != null ? formatNumber(normalized.bid) : "-",
      ask: normalized.ask != null ? formatNumber(normalized.ask) : "-",
      yield: normalized.yield != null ? formatNumber(normalized.yield, 3) : "-",
      prev: normalized.prev != null ? formatNumber(normalized.prev) : "-",
      symbol: typeof normalized.symbol === 'string' ? normalized.symbol : "-",
      volume: typeof normalized.volume === 'string' || typeof normalized.volume === 'number' ? normalized.volume : "-",
    };
    });
  }, [data, renderRow]);

  // Handlers de botones sin recargar
  const handleMarketClick = (newMarket: keyof typeof MARKETS) => {
    const firstSub = MARKETS[newMarket].buttons[0];
    setMarket(newMarket);
    setSubMarket(firstSub);
    onMarketChange(newMarket);

    // Actualiza solo la URL sin recargar nada
    const params = new URLSearchParams({ market: newMarket, from: "landing" });
    window.history.pushState({}, "", `?${params.toString()}`);
  };

  const handleSubClick = (sub: string) => {
    setSubMarket(sub);

    const params = new URLSearchParams({ market: market as string, sub, from: "landing" });
    window.history.pushState({}, "", `?${params.toString()}`);
  };

  return (
    <section className="px-4 md:px-12 py-8">
      {/* Botones principales */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.keys(MARKETS).map((m) => (
          <button
            key={m}
            onClick={() => handleMarketClick(m as keyof typeof MARKETS)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              market === m
                ? "bg-yellow-400 text-black"
                : "bg-gray-800 text-yellow-300 hover:bg-gray-700"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Botones secundarios */}
      <div className="flex flex-wrap gap-2 mb-6">
        {buttons.map((sub) => (
          <button
            key={sub}
            onClick={() => handleSubClick(sub)}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${
              subMarket === sub
                ? "bg-yellow-400 text-black"
                : "bg-gray-800 text-yellow-300 hover:bg-gray-700"
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Tabla de datos */}
      <DataTableMarket
        rows={rows}
        market={market}
        subMarket={subMarket}
        lastUpdated={lastUpdated}
        loading={loading}
        error={error}
      />
    </section>
  );
}