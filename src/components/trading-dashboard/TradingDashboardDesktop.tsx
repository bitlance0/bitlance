// src/components/trading-dashboard/TradingDashboardDesktop.tsx
"use client";

import { Separator } from "@/components/ui/separator";
import { useMarketStore } from "@/stores/useMarketStore";
import SearchBar from "@/components/trading-dashboard/SearchBar";
import SymbolList from "@/components/trading-dashboard/SymbolList";
import MarketHeader from "@/components/trading-dashboard/MarketHeader";
import OperationsInfo from "@/components/trading-dashboard/OperationsInfo";
import { FilterSelect } from "@/components/trading-dashboard/FilterSelect";
import AlphaCandleChart from "@/components/trading-dashboard/AlphaCandleChart";
import { ConfirmProvider } from "../common/ConfirmDialog";

const TradingDashboard = () => {
  const { selectedSymbol } = useMarketStore();

  return (
    /**
     * Layout desktop:
     * - Columna flex:
     *    - Arriba: símbolos + gráfico (flex-1, ocupa el espacio disponible)
     *    - Abajo: información de cuenta + operaciones (alto automático)
     */
    <section className="flex flex-col w-full min-h-[calc(100vh-80px)] gap-4">
      {/* ===== PARTE SUPERIOR: símbolos + gráfico ===== */}
      <div className="flex-1 min-h-0 grid grid-cols-[minmax(260px,3fr)_minmax(0,7fr)] gap-4">
        {/* Columna izquierda (símbolos) */}
        <div className="flex flex-col min-h-0 border-r border-gray-200 overflow-hidden">
          {/* Header del panel de mercado */}
          <div className="bg-accent-foreground border-gray-200 pb-4 px-2">
            <div className="space-y-3">
              <div className="flex gap-2">
                <SearchBar />
              </div>
              <FilterSelect />
            </div>
            <MarketHeader />
          </div>

          <Separator className="bg-gray-500/50" />

          {/* Lista de símbolos con scroll interno */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <SymbolList />
          </div>
        </div>

        {/* Columna derecha (gráfico) */}
        <div className="flex flex-col min-h-0">
          {selectedSymbol ? (
            <div className="flex-1 min-h-0">
              <AlphaCandleChart interval="15min" />
            </div>
          ) : (
            <div className="p-4">
              Selecciona un símbolo para ver el gráfico
            </div>
          )}
        </div>
      </div>

      {/* ===== PARTE INFERIOR: información de cuenta + operaciones ===== */}
      <footer className="border-t border-gray-200">
        <div className="p-4">
          <ConfirmProvider>
            <OperationsInfo />
          </ConfirmProvider>
        </div>
      </footer>
    </section>
  );
};

export default TradingDashboard;
