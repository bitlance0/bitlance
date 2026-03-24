// src/components/trading-dashboard/mobile/TradingDashboardMobile.tsx
"use client";

import { useEffect, useState } from "react";
import OperationsInfo from "../OperationsInfo";
import { useMarketStore } from "@/stores/useMarketStore";
import SearchBar from "@/components/trading-dashboard/SearchBar";
import SymbolList from "@/components/trading-dashboard/SymbolList";
import AlphaCandleChart from "@/components/trading-dashboard/AlphaCandleChart";
import MarketHeader from "@/components/trading-dashboard/MarketHeader";
import { FilterSelect } from "@/components/trading-dashboard/FilterSelect";
import MarketLookup from "@/components/trading-dashboard/MarketLookup";
import {
  getDashboardMarketLabel,
  toDashboardMarket,
} from "@/lib/itick/dashboardMarketHelpers";
import { ConfirmProvider } from "@/components/common/ConfirmDialog";

export default function TradingDashboardMobile() {
  const { selectedMarket, selectedSymbol } = useMarketStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const marketLabel = selectedMarket
    ? getDashboardMarketLabel(toDashboardMarket(selectedMarket))
    : "Selecciona un mercado";

  return (
    <ConfirmProvider>
      <div className="flex min-h-screen w-full flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="flex flex-col gap-4 p-4">
          <OperationsInfo />

          <MarketLookup />
          <FilterSelect />
          <SearchBar />

          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="flex w-full items-center justify-between px-4 py-3 text-base font-medium text-[var(--color-primary)]"
            >
              <span>{marketLabel}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transition-transform ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isOpen ? (
              <div className="border-t border-[var(--color-border)] transition-all duration-300">
                <div className="px-2">
                  <MarketHeader />
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  <SymbolList />
                </div>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {selectedSymbol ? (
              <AlphaCandleChart interval="15min" />
            ) : (
              <div className="p-4 text-center text-[var(--color-text-muted)]">
                Selecciona un simbolo para ver el grafico
              </div>
            )}
          </div>
        </div>
      </div>
    </ConfirmProvider>
  );
}
