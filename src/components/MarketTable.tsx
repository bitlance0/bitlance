// src/components/MarketTable.tsx
'use client';
import { MARKETS } from '@/lib/markets';
import { MarketQuote } from '@/types/interfaces';
import { useEffect, useState } from 'react';

type Market = typeof MARKETS[number];

function fmt(n?: number, digits = 2) {
  if (n === undefined || n === null || Number.isNaN(n)) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function MarketTable() {
  const [market, setMarket] = useState<Market>('indices');
  const [data, setData] = useState<MarketQuote[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  async function load(m: Market) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/markets?market=${encodeURIComponent(m)}`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json: MarketQuote[] = await res.json();
      setData(json);
      setLastUpdated(Date.now());
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Fetch error');
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(market);
    const id = setInterval(() => load(market), 60_000); // refrescar cada 60s
    return () => clearInterval(id);
  }, [market]);

  const filtered = (data || []).filter(q => {
    if (!search) return true;
    return q.symbol.toLowerCase().includes(search.toLowerCase());
  });

  function fmtDate(latestTradingDay: string): import("react").ReactNode {
    // Try to parse as ISO date or fallback to display as is
    const date = new Date(latestTradingDay);
    if (isNaN(date.getTime())) return latestTradingDay;
    // Show as "dd/MM/yyyy HH:mm" if time is present, else just "dd/MM/yyyy"
    const hasTime = latestTradingDay.includes('T') || latestTradingDay.includes(':');
    return hasTime
    ? date.toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <div className="p-4 min-h-[200px]">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {MARKETS.map(m => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              aria-pressed={m === market}
              className={`px-3 py-1 rounded-full text-sm font-semibold transition-shadow focus:outline-none
                ${m === market
                  ? 'bg-yellow-400 text-black shadow-[0_4px_14px_rgba(249,204,54,0.18)]'
                  : 'bg-transparent text-yellow-300 border border-yellow-800 hover:bg-yellow-900/30'}
              `}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar símbolo..."
            className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            aria-label="Buscar símbolo"
            type="search"
          />
          <div className="ml-auto text-xs text-yellow-300">
            {lastUpdated ? `Última actualización: ${new Date(lastUpdated).toLocaleTimeString()}` : 'Sin datos aún'}
          </div>
        </div>
      </div>

      <div className="bg-black text-yellow-300 rounded-lg shadow-lg overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-900/60 text-yellow-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm">Símbolo</th>
              <th className="px-4 py-3 text-right text-sm">Precio</th>
              <th className="px-4 py-3 text-right text-sm hidden sm:table-cell">Máx</th>
              <th className="px-4 py-3 text-right text-sm hidden md:table-cell">Mín</th>
              <th className="px-4 py-3 text-right text-sm">Var</th>
              <th className="px-4 py-3 text-right text-sm">% Var</th>
              <th className="px-4 py-3 text-right text-sm hidden lg:table-cell">Hora</th>
            </tr>
          </thead>

          <tbody>
            {loading && !data ? (
              // simple skeleton rows
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-gray-800">
                  <td className="px-4 py-4"><div className="h-4 bg-gray-800 rounded w-20 animate-pulse" /></td>
                  <td className="px-4 py-4 text-right"><div className="h-4 bg-gray-800 rounded w-16 mx-auto animate-pulse" /></td>
                  <td className="px-4 py-4 text-right hidden sm:table-cell"><div className="h-4 bg-gray-800 rounded w-16 mx-auto animate-pulse" /></td>
                  <td className="px-4 py-4 text-right hidden md:table-cell"><div className="h-4 bg-gray-800 rounded w-16 mx-auto animate-pulse" /></td>
                  <td className="px-4 py-4 text-right"><div className="h-4 bg-gray-800 rounded w-12 mx-auto animate-pulse" /></td>
                  <td className="px-4 py-4 text-right"><div className="h-4 bg-gray-800 rounded w-12 mx-auto animate-pulse" /></td>
                  <td className="px-4 py-4 text-right hidden lg:table-cell"><div className="h-4 bg-gray-800 rounded w-20 mx-auto animate-pulse" /></td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-red-500">Error: {error}</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">No hay resultados</td>
              </tr>
            ) : (
              filtered.map((q) => {
                const positive = (q.change ?? 0) >= 0;
                const changeColor = positive ? 'text-green-400' : 'text-red-400';
                const arrow = positive ? '▲' : '▼';
              
                return (
                  <tr key={q.symbol} className="border-t border-gray-800 hover:bg-gray-900/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-yellow-300">{q.symbol}</td>
                    <td className="px-4 py-3 text-right text-white">{fmt(q.price, 2)}</td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-gray-300">{q.high ? fmt(q.high, 2) : '-'}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell text-gray-300">{q.low ? fmt(q.low, 2) : '-'}</td>
                    <td className={`px-4 py-3 text-right ${changeColor} font-medium`}>{q.change !== undefined ? fmt(q.change, 2) : '-'}</td>
                    <td className={`px-4 py-3 text-right ${changeColor} font-medium`}>
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xs opacity-80">{arrow}</span>
                        {q.changePercent !== undefined ? `${fmt(q.changePercent, 2)}%` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400 hidden lg:table-cell">{q.latestTradingDay ? fmtDate(q.latestTradingDay) : '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="text-xs text-gray-400">Mostrando: <span className="text-yellow-300 font-medium">{market}</span> · {filtered.length} elementos</div>
        <div className="text-xs text-gray-500">Datos aproximados mientras cache activo</div>
      </div>
    </div>
  );
}
