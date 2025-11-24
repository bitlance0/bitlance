// src/components/market/DataTableMarket.tsx
"use client";

import { useMemo, useState } from "react";
import { HEADERS, KEYS } from "@/config/markets";

// 🔹 Define tipos específicos
interface TableRow {
  name: string;
  last: string | number;
  high: string | number;
  low: string | number;
  chg: string | number;
  chgPct: string | number;
  time: string;
  url: string;
  month?: string | number;
  bid?: string | number;
  ask?: string | number;
  yield?: string | number;
  prev?: string | number;
  symbol?: string;
  volume?: string | number;
  [key: string]: string | number | undefined;
}

interface DataTableMarketProps {
  rows: TableRow[];
  market: string;
  subMarket?: string;
  lastUpdated?: number;
  loading?: boolean;
  error?: string | null;
}

// 🔹 Helper functions
function formatVolume(n?: number | string, decimals = 2): string {
  if (!n) return "-";
  
  const num = typeof n === 'string' ? Number(n.replace(/,/g, '')) : Number(n);
  if (isNaN(num) || num <= 0) return "-";

  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(decimals) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(decimals) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(decimals) + "K";
  return num.toString();
}

function formatTime(time?: string | number, offsetSeconds = 0): string {
  if (!time) return "-";

  const ts = Number(time) * 1000;
  const date = new Date(ts + offsetSeconds * 1000);
  if (isNaN(date.getTime())) return "-";

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export default function DataTableMarket({
  rows,
  market,
  // lastUpdated,
  loading,
  error,
}: DataTableMarketProps) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const term = search.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some(
        (v) => v !== undefined && v !== null && v.toString().toLowerCase().includes(term)
      )
    );
  }, [rows, search]);
  
  const headers = HEADERS[market] || [];
  const marketKey = Object.keys(KEYS).find(k => k.toLowerCase() === market.toLowerCase());
  const keys = marketKey ? KEYS[marketKey as keyof typeof KEYS] : [];

  const renderCellValue = (key: string, row: TableRow) => {
    const value = row[key] ?? "-";
    
    if (key.toLowerCase() === "chg" || key.toLowerCase() === "chgpct") {
      const numValue = typeof value === 'string' ? Number(value.replace(/,/g, "")) : Number(value);
      
      if (isNaN(numValue)) return value;
      
      if (numValue === 0) {
        // Valor cero: solo negrilla sin color ni flecha
        const displayValue = key.toLowerCase() === "chgpct" ? `${numValue.toFixed(2)}%` : numValue.toFixed(2);
        return (
          <span className="font-semibold">
            {displayValue}
          </span>
        );
      } else {
        // Valor positivo o negativo: flecha y color
        const positive = numValue > 0;
        const arrow = positive ? "▲" : "▼";
        const displayValue = key.toLowerCase() === "chgpct" ? `${Math.abs(numValue).toFixed(2)}%` : Math.abs(numValue).toFixed(2);
        
        return (
          <span className={`inline-flex items-center gap-1 ${positive ? 'text-green-400' : 'text-red-400'}`}>
            <span className="text-xs opacity-80">{arrow}</span>
            {displayValue}
          </span>
        );
      }
    }

    if (key.toLowerCase() === "volume") return formatVolume(value);
    if (key.toLowerCase() === "time") return formatTime(value, 3740);

    return value;
  };

  const getCellClassName = (key: string, index: number) => {
    let className = "px-4 py-3 text-sm";
    
    if (index === 0) {
      className += " font-semibold text-yellow-300 text-left";
    } else {
      className += " text-right";
    }

    // Para celdas de cambio, el color se maneja en el contenido
    if (key.toLowerCase() === "chg" || key.toLowerCase() === "chgpct") {
      className = className.replace(/text-(green|red)-400/g, '').trim();
    }

    return className;
  };

  return (
    <div className="p-4 min-h-[200px]">
      {/* Buscador */}
      <div className="mb-4 flex flex-col gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-yellow-200"
          aria-label="Buscar"
          type="search"
        />
      </div>

      {/* Tabla */}
      <div className="bg-black rounded-lg shadow-lg overflow-x-auto">
        <table className="min-w-full table-auto text-gray-200">
          <thead className="bg-gray-900/60 text-yellow-200">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-sm whitespace-nowrap ${i === 0 ? "text-left" : "text-right"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-gray-800">
                  {headers.map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-gray-800 rounded w-20 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-6 text-center text-red-400">
                  Error: {error}
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-6 text-center text-gray-400">
                  No hay resultados
                </td>
              </tr>
            ) : (
              filteredRows.map((row, i) => (
                <tr key={i} className="border-t border-gray-800 hover:bg-gray-900/60 transition-colors">
                  {keys.map((key, j) => (
                    <td key={key} className={getCellClassName(key, j)}>
                      {renderCellValue(key, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}