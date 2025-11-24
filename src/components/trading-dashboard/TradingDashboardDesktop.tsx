// src/components/trading-dashboard/TradingDashboardDesktop.tsx
'use client';

import { Separator } from '@/components/ui/separator';
import { useMarketStore } from '@/stores/useMarketStore';
import SearchBar from '@/components/trading-dashboard/SearchBar';
import SymbolList from '@/components/trading-dashboard/SymbolList';
import MarketHeader from '@/components/trading-dashboard/MarketHeader';
import OperationsInfo from '@/components/trading-dashboard/OperationsInfo';
import { FilterSelect } from '@/components/trading-dashboard/FilterSelect';
import AlphaCandleChart from '@/components/trading-dashboard/AlphaCandleChart';
import { ConfirmProvider } from '../common/ConfirmDialog';

const TradingDashboard = () => {
  const { selectedSymbol } = useMarketStore();

  return (
    <section className='flex-1 flex-col h-full'>
      <div className="flex h-[70%] w-full">
        {/* Panel lateral izquierdo */}
        <div className="flex flex-col border-r border-gray-200 transition-all duration-300 w-fit">
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
          <div className="flex-1 overflow-hidden">
            <SymbolList />
          </div>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col">
          {selectedSymbol
            ? <AlphaCandleChart interval="15min" />
            : <div className="p-4">Selecciona un símbolo para ver el gráfico</div>}
        </div>
      </div>

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
