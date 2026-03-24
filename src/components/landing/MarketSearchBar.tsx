// src/components/landing/MarketSearchBar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

export type MarketSearchItem = {
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
  logo: string | null;
  apiType: string | null;
};

type MarketSearchResponse = {
  query: string;
  total: number;
  returned: number;
  remaining: number;
  results: MarketSearchItem[];
  tookMs: number;
};

interface MarketSearchBarProps {
  onSelect: (item: MarketSearchItem) => void;
}

export default function MarketSearchBar({ onSelect }: MarketSearchBarProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [limit, setLimit] = useState(5);
  const [showAll, setShowAll] = useState(false);
  const [resultsExpanded, setResultsExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<MarketSearchResponse | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    setLimit(5);
    setShowAll(false);
    setResultsExpanded(true);
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
      return "Escribe al menos 2 caracteres para buscar por simbolo, nombre, region, exchange, sector o logo.";
    }

    if (loading) return "Buscando en catalogo de mercados...";
    if (error) return `Error: ${error}`;
    if (!response || total === 0) return "Sin coincidencias.";

    if (remaining > 0) {
      return `Mostrando ${matches.length} de ${total} coincidencias (${remaining} pendientes).`;
    }

    return `Mostrando ${matches.length} coincidencias.`;
  }, [debouncedQuery.length, loading, error, response, total, remaining, matches.length]);

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-4 md:p-5">
      <label
        htmlFor="market-global-search"
        className="block text-sm font-medium text-yellow-200 mb-2"
      >
        Buscador global de mercados
      </label>

      <input
        id="market-global-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por simbolo, nombre, exchange, region, sector..."
        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />

      <p className="mt-2 text-xs text-gray-400">{helperText}</p>

      {matches.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Resultados: {matches.length} / {total}
            </span>
            <button
              type="button"
              onClick={() => setResultsExpanded((prev) => !prev)}
              className="rounded-md border border-gray-700 bg-gray-900 px-2.5 py-1 text-xs text-yellow-200 hover:border-yellow-500/70"
            >
              {resultsExpanded ? "Contraer" : "Expandir"}
            </button>
          </div>

          {resultsExpanded ? (
            <div className="space-y-2">
              {matches.map((item) => (
                <button
                  key={`${item.marketCanonical}-${item.exchange}-${item.symbol}`}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    setResultsExpanded(false);
                  }}
                  className="w-full rounded-lg border border-gray-800 bg-gray-950/80 px-3 py-2 text-left hover:border-yellow-500/70 hover:bg-gray-900 transition-colors"
                  title={`${item.symbol} - ${item.name ?? "Sin nombre"}`}
                >
                  <div className="text-sm text-yellow-300 font-semibold">
                    {item.symbol} {item.name ? `- ${item.name}` : ""}
                  </div>
                  <div className="text-xs text-gray-400">
                    {item.marketLabel} | {item.exchange}
                    {item.exchangeLabel ? ` (${item.exchangeLabel})` : ""} | Region {item.region}
                    {item.sector ? ` | Sector: ${item.sector}` : ""}
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
