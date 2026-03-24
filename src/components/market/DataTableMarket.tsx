"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

export type MarketKey =
  | "acciones"
  | "crypto"
  | "indices"
  | "commodities"
  | "fx"
  | "all";

export interface TableRow {
  symbol: string;
  price: number;
  latestTradingDay: string;
  market: MarketKey;
  source?: string;
  name?: string | null;
  sector?: string | null;
  logo?: string | null;
  logoFallback?: string | null;
}

function getMarketLabel(market: MarketKey): string {
  switch (market) {
    case "acciones":
      return "Acciones";
    case "crypto":
      return "Criptomonedas";
    case "indices":
      return "Índices";
    case "commodities":
      return "Commodities";
    case "fx":
      return "Forex";
    case "all":
      return "Fondos";
    default:
      return "Mercado";
  }
}

function SymbolAvatar({
  symbol,
  logo,
  logoFallback,
}: {
  symbol: string;
  logo?: string | null;
  logoFallback?: string | null;
}) {
  const [remoteError, setRemoteError] = useState(false);
  const [localFallbackError, setLocalFallbackError] = useState(false);
  const [localSymbolError, setLocalSymbolError] = useState(false);

  const hasRemoteLogo = Boolean(logo && logo.trim().length > 0);
  const hasLocalFallback = Boolean(
    logoFallback && logoFallback.trim().length > 0
  );
  const remoteSrc = hasRemoteLogo
    ? `https://itick.org/img/${logo}.svg`
    : null;

  const localFallbackSrc = hasLocalFallback
    ? `/symbols/${logoFallback}.png`
    : null;

  const localSymbolSrc = `/symbols/${symbol.toLowerCase()}.png`;

  if (hasRemoteLogo && !remoteError) {
    return (
      <div className="w-7 h-7 flex items-center justify-center">
        <Image
          src={remoteSrc!}
          alt={symbol}
          width={24}
          height={24}
          className="rounded-full"
          onError={() => setRemoteError(true)}
          unoptimized
        />
      </div>
    );
  }

  if (hasLocalFallback && !localFallbackError) {
    return (
      <div className="w-7 h-7 flex items-center justify-center">
        <Image
          src={localFallbackSrc!}
          alt={symbol}
          width={24}
          height={24}
          className="rounded-full"
          onError={() => setLocalFallbackError(true)}
          unoptimized
        />
      </div>
    );
  }

  if (!localSymbolError) {
    return (
      <div className="w-7 h-7 flex items-center justify-center">
        <Image
          src={localSymbolSrc}
          alt={symbol}
          width={24}
          height={24}
          className="rounded-full"
          onError={() => setLocalSymbolError(true)}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-800 text-yellow-300 font-bold">
      $
    </div>
  );
}

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
    render: (row) => <SymbolAvatar symbol={row.symbol} logo={row.logo} logoFallback={row.logoFallback} />,
  },
  {
    key: "symbol",
    label: "Nombre",
    align: "left",
    render: (row) => (
      <div className="flex flex-col">
        <span>{row.name || row.symbol}</span>
        {row.name && (
          <span className="text-xs text-gray-400 font-normal">
            {row.symbol}
          </span>
        )}
      </div>
    ),
  },
  {
    key: "price",
    label: "Precio",
    align: "right",
    render: (row) =>
      typeof row.price === "number" ? row.price.toLocaleString() : "-",
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

interface DataTableMarketProps {
  rows: TableRow[];
  market: MarketKey;
  loading?: boolean;
  error?: string | null;
}

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
      [
        row.symbol,
        row.name,
        row.sector,
        row.source,
        row.price,
        row.latestTradingDay,
      ].some(
        (v) =>
          v !== undefined &&
          v !== null &&
          v.toString().toLowerCase().includes(term)
      )
    );
  }, [rows, search]);
  const normalizedError = (error ?? "").toLowerCase();
  const normalizedErrorAscii = normalizedError
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const isMarketWithoutDataError =
    normalizedErrorAscii.includes("no devolvio datos para esta region/simbolos");
  const isPackageUnavailableError =
    normalizedErrorAscii.includes("http 403") ||
    normalizedErrorAscii.includes("tu paquete itick no soporta esta region/mercado") ||
    normalizedErrorAscii.includes("only supports subscribing to");
  const isRateLimitError =
    normalizedErrorAscii.includes("http 429") ||
    normalizedErrorAscii.includes("limite de solicitudes de itick alcanzado");
  const isSearchWithoutMatches = !loading && rows.length > 0 && filteredRows.length === 0;

  return (
    <div className="p-4 min-h-[200px]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-yellow-300">
          {getMarketLabel(market)}
        </h3>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-yellow-200"
          type="search"
        />
      </div>

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
            ) : isRateLimitError ? (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  className="px-4 py-6 text-center text-yellow-300"
                >
                  Limite temporal del proveedor iTICK. Intenta de nuevo en unos segundos.
                </td>
              </tr>
            ) : isPackageUnavailableError ? (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  className="px-4 py-6 text-center text-yellow-300"
                >
                  Mercado no disponible por el momento
                </td>
              </tr>
            ) : error && !isMarketWithoutDataError ? (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  className="px-4 py-6 text-center text-red-400"
                >
                  Error: {error}
                </td>
              </tr>
            ) : isSearchWithoutMatches ? (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  className="px-4 py-6 text-center text-gray-300"
                >
                  Sin coincidencias para la busqueda
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  className="px-4 py-6 text-center text-yellow-300"
                >
                  {isMarketWithoutDataError
                    ? "Sin datos del mercado para la region/simbolos seleccionados"
                    : "Sin datos del mercado"}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, i) => (
                <tr
                  key={`${row.symbol}-${i}`}
                  className="border-t border-gray-800 hover:bg-gray-900/60 transition-colors"
                >
                  {TABLE_COLUMNS.map((col) => (
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
