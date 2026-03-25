// src/components/trading-dashboard/MarketHeader.tsx
"use client";

import { useMarketStore } from "@/stores/useMarketStore";
import {
  getDashboardMarketLabel,
  toDashboardMarket,
} from "@/lib/itick/dashboardMarketHelpers";

export default function MarketHeader() {
  const { dataMarket, selectedMarket, selectedScope, selectedExchange } =
    useMarketStore();

  const marketLabel = selectedMarket
    ? getDashboardMarketLabel(toDashboardMarket(selectedMarket))
    : "Mercado";

  const contextLabel = [marketLabel, selectedScope, selectedExchange]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(74px,86px)_minmax(74px,86px)] items-center gap-2 px-2 pb-1 pt-4 text-[12px] text-muted-foreground">
      <div className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[var(--color-text)]">
          {contextLabel || "Mercado"} ({dataMarket.length})
        </span>
      </div>

      <span className="text-center font-semibold tracking-wide text-[var(--color-primary)]">
        Comprar
      </span>

      <span className="text-center font-semibold tracking-wide text-[var(--color-primary)]">
        Vender
      </span>
    </div>
  );
}
