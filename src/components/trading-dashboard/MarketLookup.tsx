// src/components/trading-dashboard/MarketLookup.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getExchangesForDashboardMarket,
  getRegionsForDashboardMarket,
  toDashboardMarket,
} from "@/lib/itick/dashboardMarketHelpers";
import { useMarketStore } from "@/stores/useMarketStore";

type MarketSearchItem = {
  market: string;
  marketCanonical: string;
  marketLabel: string;
  exchange: string;
  exchangeLabel: string | null;
  region: string;
  scope: string;
  symbol: string;
  name: string | null;
  sector: string | null;
};

type MarketSearchResponse = {
  total: number;
  returned: number;
  remaining: number;
  results: MarketSearchItem[];
};

export default function MarketLookup() {
  const {
    setSelectedMarket,
    setSelectedScope,
    setSelectedExchange,
    setSelectedSymbol,
    setPreferredSymbol,
    setMarketMessage,
  } = useMarketStore();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [limit, setLimit] = useState(5);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<MarketSearchResponse | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setLimit(5);
    setShowAll(false);
    setExpanded(true);
  }, [debouncedQuery]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setLoading(false);
      setError(null);
      setResponse(null);
      return;
    }

    const controller = new AbortController();
    const requestedLimit = showAll ? "all" : String(limit);

    setLoading(true);
    setError(null);

    fetch(
      `/api/itick/search?q=${encodeURIComponent(debouncedQuery)}&limit=${requestedLimit}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        const payload = (await res.json()) as MarketSearchResponse & {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(payload.error ?? `HTTP ${res.status}`);
        }

        setResponse(payload);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Error de busqueda");
        setResponse(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery, limit, showAll]);

  const matches = response?.results ?? [];
  const total = response?.total ?? 0;
  const remaining = Math.max(total - matches.length, 0);

  const helperText = useMemo(() => {
    if (debouncedQuery.length < 2) {
      return "Busca por simbolo, nombre, exchange, region o sector.";
    }
    if (loading) return "Buscando en catalogo iTICK...";
    if (error) return `Error: ${error}`;
    if (!response || total === 0) return "Sin coincidencias.";
    if (remaining > 0) {
      return `Mostrando ${matches.length} de ${total} (${remaining} pendientes).`;
    }
    return `Mostrando ${matches.length} coincidencias.`;
  }, [debouncedQuery.length, loading, error, response, total, remaining, matches.length]);

  const handleSelect = (item: MarketSearchItem) => {
    const selectedMarket = toDashboardMarket(
      item.marketCanonical || item.market
    );
    const candidateRegion = (item.region || item.scope || "").toUpperCase();
    const candidateScope = (item.scope || "").toUpperCase();
    const regions = getRegionsForDashboardMarket(selectedMarket);

    const resolvedScope = regions.includes(candidateRegion)
      ? candidateRegion
      : regions.includes(candidateScope)
        ? candidateScope
        : (regions[0] ?? null);

    const exchanges = resolvedScope
      ? getExchangesForDashboardMarket(selectedMarket, resolvedScope)
      : [];

    const resolvedExchange = exchanges.includes(item.exchange)
      ? item.exchange
      : (exchanges[0] ?? item.exchange);

    const symbol = item.symbol.trim().toUpperCase();

    setSelectedMarket(selectedMarket);
    setSelectedScope(resolvedScope);
    setSelectedExchange(resolvedExchange);
    setPreferredSymbol(symbol);
    setSelectedSymbol(symbol);
    setMarketMessage(null);
    setExpanded(false);
  };

  return (
    <div className="rounded-lg border border-gray-700/70 bg-black/25 p-3">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscador global iTICK (simbolo, nombre, region, exchange...)"
        className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />

      <p className="mt-2 text-xs text-gray-400">{helperText}</p>

      {matches.length > 0 ? (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Resultados: {matches.length} / {total}
            </span>
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="rounded-md border border-gray-700 bg-gray-900 px-2.5 py-1 text-xs text-yellow-200 hover:border-yellow-500/70"
            >
              {expanded ? "Contraer" : "Expandir"}
            </button>
          </div>

          {expanded ? (
            <div className="space-y-2">
              {matches.map((item) => (
                <button
                  key={`${item.marketCanonical}-${item.exchange}-${item.symbol}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full rounded-md border border-gray-800 bg-gray-950/80 px-3 py-2 text-left hover:border-yellow-500/70 hover:bg-gray-900 transition-colors"
                >
                  <div className="text-sm font-semibold text-yellow-300">
                    {item.symbol} {item.name ? `- ${item.name}` : ""}
                  </div>
                  <div className="text-xs text-gray-400">
                    {item.marketLabel} | {item.exchange}
                    {item.exchangeLabel ? ` (${item.exchangeLabel})` : ""} |{" "}
                    {item.region}
                    {item.sector ? ` | ${item.sector}` : ""}
                  </div>
                </button>
              ))}

              {remaining > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setLimit((prev) => prev + 5)}
                    className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-yellow-200 hover:border-yellow-500/70"
                  >
                    Ver mas (+5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-yellow-200 hover:border-yellow-500/70"
                  >
                    Ver todas ({total})
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
