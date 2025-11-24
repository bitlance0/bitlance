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

  const handleMarketSelect = useCallback((market: Market) => {
    if (market && market !== selectedMarket) setSelectedMarket(market);
    setIsOpen(false); // no abrir automáticamente
  }, [selectedMarket, setSelectedMarket]);

  const handleSearchChange = useCallback((value: string) => {
    // Evita sets redundantes
    if (value !== searchValue) setSearchValue(value);
    // Abre acordeón solo si hay texto y está cerrado
    if (value.trim().length > 0 && !isOpen) setIsOpen(true);
  }, [isOpen, searchValue]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex flex-col gap-4 p-4">
        <OperationsInfo {...({ compact: true } as any)} />

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
                {market.charAt(0).toUpperCase() + market.slice(1)}
              </button>
            );
          })}
        </div>
        <SearchBarAny onSearchChange={handleSearchChange} />

        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          <button
            onClick={() => setIsOpen((o) => !o)}
            className="w-full flex justify-between items-center px-4 py-3 text-base font-medium text-[var(--color-primary)]"
          >
            <span>{selectedMarket ? selectedMarket.charAt(0).toUpperCase() + selectedMarket.slice(1) : "Selecciona un mercado"}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isOpen && (
            <div className="max-h-[300px] overflow-y-auto border-t border-[var(--color-border)] transition-all duration-300">
              <SymbolListAny searchValue={searchValue} />
            </div>
          )}
        </div>

        <div className="rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]">
          {!!selectedSymbol ? (
            <AlphaCandleChart interval="15min" />
          ) : (
            <div className="p-4 text-center text-[var(--color-text-muted)]">Selecciona un símbolo para ver el gráfico</div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-3">
        <MobileTradingDialog />
        <div className="flex justify-center">
          <Button className="bg-[var(--color-primary)] text-[var(--color-bg)] hover:bg-[var(--color-primary-light)]">Operar ahora</Button>
        </div>
      </div>
    </div>
  );
}
