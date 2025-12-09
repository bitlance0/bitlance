// src/components/trading-dashboard/mobile/TradingDashboardMobile.tsx
"use client";

import OperationsInfo from "../OperationsInfo";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { useMarketStore } from "@/stores/useMarketStore";
import SearchBar from "@/components/trading-dashboard/SearchBar";
import SymbolList from "@/components/trading-dashboard/SymbolList";
import AlphaCandleChart from "@/components/trading-dashboard/AlphaCandleChart";
import MobileTradingDialog from "@/components/trading-dashboard/mobile/MobileTradingDialog";
import MarketHeader from "@/components/trading-dashboard/MarketHeader"; // 👈 NUEVO

type Market = "indices" | "acciones" | "commodities" | "crypto" | "fx" | "all" | null;

const MARKETS: Exclude<Market, null>[] = ["indices", "acciones", "commodities", "crypto", "fx", "all"];
const SearchBarAny = SearchBar as any;
const SymbolListAny = SymbolList as any;

export default function TradingDashboardMobile() {
  const { selectedMarket, setSelectedMarket, selectedSymbol } = useMarketStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    if (!selectedMarket) setSelectedMarket("all");
    window.scrollTo(0, 0);
  }, []); // solo una vez

  const handleMarketSelect = useCallback(
    (market: Market) => {
      if (market && market !== selectedMarket) setSelectedMarket(market);
      // no tocamos isOpen aquí
    },
    [selectedMarket, setSelectedMarket]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      if (value !== searchValue) setSearchValue(value);
      if (value.trim().length > 0 && !isOpen) setIsOpen(true);
    },
    [isOpen, searchValue]
  );

  const getMarketLabel = (market: Market) => {
    if (!market) return "";
    // ⬅️ misma regla que en FilterSelect
    if (market === "fx") return "Forex";
    // resto en “title case”
    return market.charAt(0).toUpperCase() + market.slice(1);
  };


  return (
    <div className="flex flex-col w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex flex-col gap-4 p-4">
        {/* Información de cuenta + operaciones (ya adaptado a móvil) */}
        <OperationsInfo />

        {/* Chips de mercados */}
        <div className="flex flex-wrap gap-2 justify-center">
          {MARKETS.map((market) => {
            const active = selectedMarket === market;
            return (
              <button
                key={market}
                onClick={() => handleMarketSelect(market)}
                className={[
                  "px-3 py-1 text-sm rounded-full border transition-colors duration-200",
                  active
                    ? "bg-[var(--color-primary)] text-[var(--color-bg)] border-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
                ].join(" ")}
              >
                {getMarketLabel(market)}
              </button>
            );
          })}

        </div>

        {/* Buscador */}
        <SearchBarAny onSearchChange={handleSearchChange} />

        {/* Panel colapsable de símbolos */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          {/* 🔘 Botón de cabecera (NO tocamos su altura) */}
          <button
            onClick={() => setIsOpen((o) => !o)}
            className="w-full flex justify-between items-center px-4 py-3 text-base font-medium text-[var(--color-primary)]"
          >
            <span>
              {selectedMarket
                ? selectedMarket.charAt(0).toUpperCase() + selectedMarket.slice(1)
                : "Selecciona un mercado"}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Contenido colapsable: cabecera columnas + lista */}
          {isOpen && (
            <div className="border-t border-[var(--color-border)] transition-all duration-300">
              {/* ✅ Cabecera alineada con las columnas */}
              <div className="px-2">
                <MarketHeader />
              </div>

              {/* Lista de símbolos (mantiene tus colores y layout) */}
              <div className="max-h-[320px] overflow-y-auto">
                <SymbolListAny searchValue={searchValue} />
              </div>
            </div>
          )}
        </div>

        {/* Gráfico */}
        <div className="rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]">
          {selectedSymbol ? (
            <AlphaCandleChart interval="15min" />
          ) : (
            <div className="p-4 text-center text-[var(--color-text-muted)]">
              Selecciona un símbolo para ver el gráfico
            </div>
          )}
        </div>
      </div>

      {/* Aquí ya no dejamos la barra fija de “Operar ahora” porque lo movimos a OperationsInfo/MobileTradingDialog, como ya hicimos antes */}
    </div>
  );
}
