// src/components/trading-dashboard/FilterSelect.tsx
"use client";

import { useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMarketStore } from "@/stores/useMarketStore";

export function FilterSelect() {
  const {
    markets,
    selectedMarket,
    selectMarket,
    setSelectedMarket,
  } = useMarketStore();

  const didInitRef = useRef(false);
  const switchingRef = useRef(false);

  // Selección por defecto al montar
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const def = markets.find((m) => m === "fx") || markets[0] || null;
    if (!selectedMarket && def) {
      // selectMarket acepta string; no hace falta castear a Market
      void selectMarket(def);
    }
  }, [markets, selectedMarket, selectMarket]);

  // Cambio con anti-ráfagas
  const handleChange = async (value: string) => {
    if (switchingRef.current) return;
    switchingRef.current = true;
    try {
      const found = markets.find((m) => m === value);
      if (!found) {
        setSelectedMarket(null);
        return;
      }
      await selectMarket(found); // tu store define (marketKey: string) => Promise<void>
    } finally {
      switchingRef.current = false;
    }
  };

  // Valor controlado (si no hay selección y existe 'indices', úsalo)
  const controlledValue: string | undefined =
    selectedMarket ?? (markets.includes("fx") ? "fx" : undefined);

  return (
    <Select
      value={controlledValue}
      onValueChange={handleChange}
      disabled={switchingRef.current}
    >
      <SelectTrigger className="w-full border border-gray-50/80 text-yellow-300">
        <SelectValue placeholder="Seleccionar mercado" />
      </SelectTrigger>

      <SelectContent className="text-yellow-300 border border-gray-50/80 bg-[#181a20e7]">
        {markets.map((market) => (
          <SelectItem key={market} value={market}>
            {market === "fx"
              ? "Forex"
              : market}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
