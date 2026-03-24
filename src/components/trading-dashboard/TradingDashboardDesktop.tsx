// src/components/trading-dashboard/TradingDashboardDesktop.tsx
"use client";

import { Separator } from "@/components/ui/separator";
import { useMarketStore } from "@/stores/useMarketStore";
import SearchBar from "@/components/trading-dashboard/SearchBar";
import SymbolList from "@/components/trading-dashboard/SymbolList";
import MarketHeader from "@/components/trading-dashboard/MarketHeader";
import OperationsInfo from "@/components/trading-dashboard/OperationsInfo";
import { FilterSelect } from "@/components/trading-dashboard/FilterSelect";
import MarketLookup from "@/components/trading-dashboard/MarketLookup";
import AlphaCandleChart from "@/components/trading-dashboard/AlphaCandleChart";
import { ConfirmProvider } from "../common/ConfirmDialog";

const TradingDashboardDesktop = () => {
  const { selectedSymbol } = useMarketStore();

  return (
    <ConfirmProvider>
      <section className="flex w-full min-h-[calc(100vh-80px)] flex-col gap-4">
        <div className="grid flex-1 min-h-0 grid-cols-[minmax(260px,3fr)_minmax(0,7fr)] gap-4">
          <div className="flex min-h-0 flex-col overflow-hidden border-r border-gray-200">
            <div className="bg-accent-foreground border-gray-200 px-2 pb-4">
              <div className="space-y-3">
                <MarketLookup />
                <div className="flex gap-2">
                  <SearchBar />
                </div>
                <FilterSelect />
              </div>
              <MarketHeader />
            </div>

            <Separator className="bg-gray-500/50" />

            <div className="min-h-0 flex-1 overflow-y-auto">
              <SymbolList />
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            {selectedSymbol ? (
              <div className="min-h-0 flex-1">
                <AlphaCandleChart interval="15min" />
              </div>
            ) : (
              <div className="p-4">Selecciona un simbolo para ver el grafico</div>
            )}
          </div>
        </div>

        <footer className="border-t border-gray-200">
          <div className="p-4">
            <OperationsInfo />
          </div>
        </footer>
      </section>
    </ConfirmProvider>
  );
};

export default TradingDashboardDesktop;
