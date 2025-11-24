// src/components/DataTable.tsx
"use client";

import React from "react";

type RowShape = {
  [key: string]: unknown; // flexible para distintos markets
  name?: string;
  last?: number | string;
  high?: number | string;
  low?: number | string;
  chg?: number | string;
  chgPct?: number | string;
  time?: string;
  url?: string;
};

export default function DataTable({
  headers,
  rows,
  loading,
  error,
  searchable = false,
  search,
  onSearchChange,
  lastUpdated,
}: {
  headers: string[];
  rows: RowShape[];
  loading: boolean;
  error?: string | null;
  searchable?: boolean;
  search?: string;
  onSearchChange?: (v: string) => void;
  lastUpdated?: number | null;
}) {
  return (
    <div className="p-4 min-h-[200px]">
      {/* Buscador y status */}
      <div className="mb-4 flex flex-col gap-3">
        {searchable && (
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Buscar..."
              className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              type="search"
            />
            <div className="ml-auto text-xs text-yellow-300">
              {lastUpdated
                ? `Última actualización: ${new Date(
                    lastUpdated
                  ).toLocaleTimeString()}`
                : "Sin datos aún"}
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-black text-yellow-300 rounded-lg shadow-lg overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-900/60 text-yellow-200">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-sm first:text-left"
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
                    <td
                      key={j}
                      className="px-4 py-4 text-right first:text-left"
                    >
                      <div className="h-4 bg-gray-800 rounded w-20 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-6 text-center text-red-500"
                >
                  Error: {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-6 text-center text-gray-400"
                >
                  No hay resultados
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const chg = Number(r.chg) || 0;
                const chgPct = Number(r.chgPct) || 0;
                const chgPositive = chg > 0 || chgPct > 0;

                return (
                  <tr
                    key={i}
                    className="border-t border-gray-800 hover:bg-gray-900/60 transition-colors"
                  >
                    {headers.map((h, j) => {
                      let value: React.ReactNode = String(r[h.toLowerCase()] ?? "—");

                      if (h === "Chg." || h === "Chg. %") {
                        value =
                          h === "Chg."
                            ? formatNumber(r.chg)
                            : formatPercent(r.chgPct);
                      }

                      if (h === "Time") {
                        value = formatTime(r.time);
                      }

                      return (
                        <td
                          key={j}
                          className={`px-4 py-3 text-right first:text-left ${
                            h === "Chg." || h === "Chg. %"
                              ? chgPositive
                                ? "text-green-400"
                                : "text-red-400"
                              : ""
                          }`}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* Helpers */
function formatNumber(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number")
    return v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  return v.toString();
}

function formatPercent(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  return typeof v === "number"
    ? `${v > 0 ? "+" : ""}${v.toFixed(2)}%`
    : v.toString();
}

function formatTime(ts: unknown) {
  if (!ts) return "—";
  const n = Number(ts);
  if (!isNaN(n) && n > 1000000000) {
    const d = new Date(n * 1000);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return ts.toString();
}
