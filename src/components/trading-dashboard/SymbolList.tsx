// src/components/trading-dashboard/SymbolList.tsx
"use client";

import React, { useMemo } from "react";
import SymbolRow from "./SymbolRow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketStore } from "@/stores/useMarketStore";

export default function SymbolList() {
  // ✅ Selectores parciales para evitar renders innecesarios
  const dataMarket = useMarketStore((s) => s.dataMarket);
  const filters = useMarketStore((s) => s.filters);
  const isLoading = useMarketStore((s) => s.isLoading);

  // ✅ Filtro eficiente por símbolo (solo por texto)
  const filteredMarkets = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    if (!search) return dataMarket;
    return dataMarket.filter((m) =>
      m.symbol?.toLowerCase().includes(search)
    );
  }, [dataMarket, filters.search]);

  return (
    <div className="shadow-sm h-full">
      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex space-x-3">
              <Skeleton className="w-8 h-8 rounded-full bg-yellow-500/20" />
              <div className="space-y-2 w-full">
                <Skeleton className="h-3 w-3/4 bg-yellow-500/20" />
                <Skeleton className="h-3 w-1/2 bg-yellow-500/10" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ScrollArea  className="h-64 md:h-80 lg:h-96">
          {filteredMarkets.length > 0 ? (
            <div className="divide-white/5">
              {filteredMarkets.map((market) => (
                <SymbolRow key={market.symbol} {...market} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-yellow-300 text-sm">
              No se encontraron resultados.
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
