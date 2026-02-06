// src/components/market/DataTableMarket.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { MARKETS, MarketKey } from "@/lib/marketsLanding";

/* ======================================================
   Tipos
====================================================== */

export interface TableRow {
  symbol: string;
  price: number;
  latestTradingDay: string;
  market: MarketKey;
  source?: string;
}

/* ======================================================
   Celda de Icono / Avatar
====================================================== */

function SymbolAvatar({ symbol }: { symbol: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-800 text-yellow-300 font-bold">
        $
      </div>
    );
  }

  return (
    <div className="w-7 h-7 flex items-center justify-center">
      <Image
        src={`/symbols/${symbol}.png`}
        alt={symbol}
        width={24}
        height={24}
        className="rounded-full"
        onError={() => setError(true)}
        unoptimized
      />
    </div>
  );
}


/* ======================================================
   Configuración central de columnas
====================================================== */

const TABLE_COLUMNS: {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: TableRow) => React.ReactNode;
}[] = [
  {
    key: "icon",
    label: "",
    align: "center",
    render: (row) => <SymbolAvatar symbol={row.symbol} />,
  },
  {
    key: "symbol",
    label: "Nombre",
    align: "left",
    render: (row) => row.symbol,
  },
  {
    key: "price",
    label: "Precio",
    align: "right",
    render: (row) =>
      typeof row.price === "number"
        ? row.price.toLocaleString()
        : "-",
  },
  {
    key: "latestTradingDay",
    label: "Última hora",
    align: "right",
    render: (row) => {
      const d = new Date(row.latestTradingDay);
      return isNaN(d.getTime())
        ? "-"
        : d.toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
    },
  },
];

/* ======================================================
   Props
====================================================== */

interface DataTableMarketProps {
  rows: TableRow[];
  market: MarketKey;
  loading?: boolean;
  error?: string | null;
}

/* ======================================================
   Componente
====================================================== */

export default function DataTableMarket({
  rows,
  market,
  loading,
  error,
}: DataTableMarketProps) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const term = search.toLowerCase();

    return rows.filter((row) =>
      Object.values(row).some(
        (v) =>
          v !== undefined &&
          v !== null &&
          v.toString().toLowerCase().includes(term)
      )
    );
  }, [rows, search]);

  if (!loading && rows.length === 0) {
    return <p className="text-gray-400">No hay datos</p>;
  }

  return (
    <div className="p-4 min-h-[200px]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-yellow-300">
          {MARKETS[market]?.label}
        </h3>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm
                     placeholder-gray-500 focus:outline-none focus:ring-2
                     focus:ring-yellow-400 text-yellow-200"
          type="search"
        />
      </div>

      {/* Tabla */}
      <div className="bg-black rounded-lg shadow-lg overflow-x-auto">
        <table className="min-w-full table-auto text-gray-200">
          <thead className="bg-gray-900/60 text-yellow-200">
            <tr>
              {TABLE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-sm whitespace-nowrap ${
                    col.align === "left"
                      ? "text-left"
                      : col.align === "center"
                      ? "text-center"
                      : "text-right"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-gray-800">
                  {TABLE_COLUMNS.map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-gray-800 rounded w-16 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  className="px-4 py-6 text-center text-red-400"
                >
                  Error: {error}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, i) => (
                <tr
                  key={i}
                  className="border-t border-gray-800 hover:bg-gray-900/60 transition-colors"
                >
                  {TABLE_COLUMNS.map((col, j) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm ${
                        col.align === "left"
                          ? "text-left font-semibold text-yellow-300"
                          : col.align === "center"
                          ? "text-center"
                          : "text-right"
                      }`}
                    >
                      {col.render?.(row)}
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
