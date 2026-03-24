// src/components/trading-dashboard/FilterSelect.tsx
"use client";

import { useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMarketStore } from "@/stores/useMarketStore";
import {
  getAvailableDashboardMarkets,
  getDashboardMarketLabel,
  getDefaultSelectionForDashboardMarket,
  getExchangesForDashboardMarket,
  getRegionsForDashboardMarket,
  getRegionLabel,
  type DashboardMarketKey,
} from "@/lib/itick/dashboardMarketHelpers";

function toDashboardMarketKey(value: string | null): DashboardMarketKey | null {
  if (!value) return null;
  const valid: DashboardMarketKey[] = [
    "favoritas",
    "fx",
    "indices",
    "acciones",
    "commodities",
    "crypto",
    "all",
  ];
  return valid.includes(value as DashboardMarketKey)
    ? (value as DashboardMarketKey)
    : null;
}

export function FilterSelect() {
  const {
    selectedMarket,
    setSelectedMarket,
    selectedScope,
    setSelectedScope,
    selectedExchange,
    setSelectedExchange,
    setSelectedSymbol,
    setPreferredSymbol,
    setMarketMessage,
  } = useMarketStore();

  const markets = useMemo(() => getAvailableDashboardMarkets(), []);
  const parsedSelectedMarket = toDashboardMarketKey(selectedMarket);
  const activeMarket =
    parsedSelectedMarket && markets.includes(parsedSelectedMarket)
      ? parsedSelectedMarket
      : (markets[0] ?? null);

  const regionOptions = useMemo(() => {
    if (!activeMarket) return [];
    return getRegionsForDashboardMarket(activeMarket);
  }, [activeMarket]);

  const exchangeOptions = useMemo(() => {
    if (!activeMarket || !selectedScope) return [];
    return getExchangesForDashboardMarket(activeMarket, selectedScope);
  }, [activeMarket, selectedScope]);

  useEffect(() => {
    if (!activeMarket) return;

    if (!selectedMarket || selectedMarket !== activeMarket) {
      const defaults = getDefaultSelectionForDashboardMarket(activeMarket);
      setSelectedMarket(activeMarket);
      setSelectedScope(defaults.scope);
      setSelectedExchange(defaults.exchange);
      return;
    }

    if (!selectedScope || !regionOptions.includes(selectedScope)) {
      const nextScope = regionOptions[0] ?? null;
      setSelectedScope(nextScope);

      if (nextScope) {
        const exchanges = getExchangesForDashboardMarket(activeMarket, nextScope);
        setSelectedExchange(exchanges[0] ?? null);
      } else {
        setSelectedExchange(null);
      }
      return;
    }

    if (!selectedExchange || !exchangeOptions.includes(selectedExchange)) {
      setSelectedExchange(exchangeOptions[0] ?? null);
    }
  }, [
    activeMarket,
    selectedMarket,
    selectedScope,
    selectedExchange,
    regionOptions,
    exchangeOptions,
    setSelectedMarket,
    setSelectedScope,
    setSelectedExchange,
  ]);

  const resetMarketSelection = () => {
    setSelectedSymbol(null);
    setPreferredSymbol(null);
    setMarketMessage(null);
  };

  return (
    <div className="grid grid-cols-1 gap-2">
      <Select
        value={activeMarket ?? undefined}
        onValueChange={(value) => {
          const nextMarket = toDashboardMarketKey(value);
          if (!nextMarket) return;

          if (nextMarket === "favoritas") {
            setSelectedMarket(nextMarket);
            setSelectedScope(null);
            setSelectedExchange(null);
            resetMarketSelection();
            return;
          }

          const defaults = getDefaultSelectionForDashboardMarket(nextMarket);
          setSelectedMarket(nextMarket);
          setSelectedScope(defaults.scope);
          setSelectedExchange(defaults.exchange);
          resetMarketSelection();
        }}
      >
        <SelectTrigger className="w-full border border-gray-50/80 text-yellow-300">
          <SelectValue placeholder="Seleccionar mercado" />
        </SelectTrigger>
        <SelectContent className="text-yellow-300 border border-gray-50/80 bg-[#181a20e7]">
          {markets.map((market) => (
            <SelectItem key={market} value={market}>
              {getDashboardMarketLabel(market)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select
          value={selectedScope ?? undefined}
          onValueChange={(value) => {
            if (!activeMarket) return;
            setSelectedScope(value);
            const nextExchanges = getExchangesForDashboardMarket(activeMarket, value);
            setSelectedExchange(nextExchanges[0] ?? null);
            resetMarketSelection();
          }}
          disabled={!regionOptions.length}
        >
          <SelectTrigger className="w-full border border-gray-50/80 text-yellow-300">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent className="text-yellow-300 border border-gray-50/80 bg-[#181a20e7]">
            {regionOptions.map((region) => (
              <SelectItem key={region} value={region}>
                {getRegionLabel(region)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedExchange ?? undefined}
          onValueChange={(value) => {
            setSelectedExchange(value);
            resetMarketSelection();
          }}
          disabled={!exchangeOptions.length}
        >
          <SelectTrigger className="w-full border border-gray-50/80 text-yellow-300">
            <SelectValue placeholder="Exchange" />
          </SelectTrigger>
          <SelectContent className="text-yellow-300 border border-gray-50/80 bg-[#181a20e7]">
            {exchangeOptions.map((exchange) => (
              <SelectItem key={exchange} value={exchange}>
                {exchange}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
