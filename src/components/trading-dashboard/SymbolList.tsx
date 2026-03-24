// src/components/trading-dashboard/SymbolList.tsx
"use client";

import { useMemo } from "react";
import SymbolRow from "./SymbolRow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketStore } from "@/stores/useMarketStore";

export default function SymbolList() {
  const dataMarket = useMarketStore((s) => s.dataMarket);
  const filters = useMarketStore((s) => s.filters);
  const isLoading = useMarketStore((s) => s.isLoading);
  const marketMessage = useMarketStore((s) => s.marketMessage);

  const filteredMarkets = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    if (!search) return dataMarket;

    return dataMarket.filter((row) => {
      const values = [
        row.symbol,
        row.name,
        row.source,
        row.market,
        row.sector,
        row.price,
      ];

      return values.some(
        (value) =>
          value !== undefined &&
          value !== null &&
          String(value).toLowerCase().includes(search)
      );
    });
  }, [dataMarket, filters.search]);

  return (
    <div className="h-full shadow-sm">
      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex space-x-3">
              <Skeleton className="h-8 w-8 rounded-full bg-yellow-500/20" />
              <div className="w-full space-y-2">
                <Skeleton className="h-3 w-3/4 bg-yellow-500/20" />
                <Skeleton className="h-3 w-1/2 bg-yellow-500/10" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ScrollArea className="h-64 md:h-80 lg:h-96">
          {filteredMarkets.length > 0 ? (
            <div className="divide-white/5">
              {filteredMarkets.map((market) => (
                <SymbolRow key={market.symbol} {...market} />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-yellow-300">
              {filters.search.trim().length > 0
                ? "No se encontraron resultados para la busqueda."
                : marketMessage ?? "Sin datos del mercado para esta seleccion."}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
