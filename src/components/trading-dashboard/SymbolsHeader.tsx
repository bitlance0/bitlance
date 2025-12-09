// src/components/trading-dashboard/SymbolsHeader.tsx
"use client";

interface SymbolsHeaderProps {
  total?: number;      // cantidad de símbolos, opcional
  className?: string;  // clases extra para adaptar a cada vista
}

export function SymbolsHeader({ total, className = "" }: SymbolsHeaderProps) {
  return (
    <div
      className={
        [
          // MISMO GRID QUE SymbolRow (4 columnas)
          "grid grid-cols-[1fr_auto_auto_auto] items-center",
          "text-[11px] uppercase tracking-wide",
          "px-3 py-2",
          "text-[var(--color-text-muted)]",
          className,
        ].join(" ")
      }
    >
      <span className="text-left">
        Mercado{typeof total === "number" ? ` (${total})` : ""}
      </span>

      {/* Columna de "Comprar" alineada con el botón de buy de las filas */}
      <span className="text-center">Comprar</span>

      {/* Columna central (cambio). Puedes dejarla vacía o poner Δ */}
      <span className="text-center opacity-60">Δ</span>

      {/* Columna de "Vender" alineada con el botón de sell de las filas */}
      <span className="text-center">Vender</span>
    </div>
  );
}
