"use client";

import { useMarketStore } from "@/stores/useMarketStore";

export default function MarketHeader() {
  const { dataMarket } = useMarketStore();

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 pt-4 pb-1 px-2 text-[13px] text-muted-foreground">
      {/* Columna 1 → Nombre del símbolo */}
      <span className="font-semibold text-sm text-[var(--color-text)]">
        Mercado ({dataMarket.length})
      </span>

      {/* Columna 2 → BUY */}
      <span className="text-center w-[60px]">
        Comprar
      </span>

      {/* Columna 3 → espacio del cambio */}
      <span className="text-center w-[60px] opacity-0">
        ▲ --
      </span>

      {/* Columna 4 → SELL */}
      <span className="text-center w-[60px]">
        Vender
      </span>
    </div>
  );
}
