// src/app/(app)/(dashboard)/cuentas/_components/AccountCard.tsx
"use client";

import { Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Tipos locales: no dependemos de page.tsx */
export type AccountType = "trading" | "inversion" | "ahorro";
export type AccountState = "activa" | "suspendida" | "cerrada";

export type AccountCardProps = {
  id: string;
  numero: string;
  tipo: AccountType;
  moneda: "USD" | "BTC" | "ETH" | string;
  balance: number;
  balanceDisponible: number;
  estado: AccountState;
  fechaCreacion: string; // ISO
  /** Opcional: sparkline (0..1) normalizado; si no llega, se genera */
  sparkline?: number[];
  /** Etiquetas opcionales (p.ej. DEMO/REAL) */
  badges?: string[];
  onView?: (id: string) => void;
  onStatus?: (id: string) => void;
  onOperate?: (id: string) => void;
  onSelectActive?: (id: string) => void;
};

function tipoClasses(tipo: AccountType) {
  switch (tipo) {
    case "trading": return "bg-blue-500/15 text-blue-400 border-blue-400/30";
    case "inversion": return "bg-green-500/15 text-green-400 border-green-400/30";
    case "ahorro": return "bg-purple-500/15 text-purple-400 border-purple-400/30";
    default: return "bg-gray-500/15 text-gray-400 border-gray-400/30";
  }
}

function estadoClasses(estado: AccountState) {
  switch (estado) {
    case "activa": return "bg-emerald-500/15 text-emerald-400 border-emerald-400/30";
    case "suspendida": return "bg-amber-500/15 text-amber-400 border-amber-400/30";
    case "cerrada": return "bg-red-500/15 text-red-400 border-red-400/30";
    default: return "bg-gray-500/15 text-gray-400 border-gray-400/30";
  }
}

/** sparkline simple en SVG a partir de un array 0..1 */
function Sparkline({ points = [] }: { points?: number[] }) {
  const w = 120, h = 36, pad = 2;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1));
  const ys = points.map(v => {
    const clamped = Math.min(1, Math.max(0, v));
    // invertimos Y (0 abajo, 1 arriba)
    return pad + (1 - clamped) * (h - pad * 2);
  });
  const d = points.length
    ? `M ${xs.map((x, i) => `${x},${ys[i]}`).join(" L ")}`
    : `M ${pad},${h / 2} L ${w - pad},${h / 2}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80">
      <path d={d} fill="none" stroke="currentColor" className="text-[var(--color-primary)]" strokeWidth="1.5" />
    </svg>
  );
}// src/app/(app)/(dashboard)/cuentas/_components/AccountCard.tsx

export default function AccountCard({
  id,
  numero,
  tipo,
  moneda,
  balance,
  balanceDisponible,
  estado,
  fechaCreacion,
  sparkline,
  badges = [],
  onView,
  onStatus,
  onOperate,
  onSelectActive,
}: AccountCardProps) {
  // Genera sparkline si no llega: pequeña variación pseudoaleatoria estable por id
  const fallback = (() => {
    const seed = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
    const arr = Array.from({ length: 16 }, (_, i) => {
      const v = Math.abs(Math.sin(seed * (i + 1))) % 1;
      return 0.35 + v * 0.55; // 0.35..0.9
    });
    return arr;
  })();

  const fmt = (val: number) =>
    moneda === "USD"
      ? `$${val.toLocaleString()}`
      : `${val.toLocaleString()} ${moneda}`;

  const fecha = new Date(fechaCreacion).toLocaleDateString("es-ES");

  return (
    <div className="border rounded-xl p-4 bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface)] transition-colors">
      <div className="flex flex-col gap-3">
        {/* ===== CABECERA COMPLETA (tipo card header) ===== */}
        <div className="flex flex-wrap justify-between items-start gap-3">
          {/* IZQUIERDA: número + chips de tipo/estado/badges */}
          <div className="min-w-0">
            <h4 className="font-bold text-lg truncate">{numero}</h4>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${tipoClasses(
                  tipo
                )}`}
              >
                {tipo === "trading"
                  ? "Trading"
                  : tipo === "inversion"
                  ? "Inversión"
                  : "Ahorro"}
              </span>

              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${estadoClasses(
                  estado
                )}`}
              >
                {estado === "activa"
                  ? "Activa"
                  : estado === "suspendida"
                  ? "Suspendida"
                  : "Cerrada"}
              </span>

              {badges.map((b, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-yellow-400/30 text-yellow-400 bg-yellow-400/10"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* DERECHA: moneda + fecha de creación, alineadas tipo resumen */}
          <div className="text-xs text-right space-y-1">
            
            <div>
              <span className="text-[var(--color-text-muted)] mr-1">
                Creada
              </span>
              <span className="font-medium text-[var(--color-text)]">
                {fecha}
              </span>
            </div>
          </div>
        </div>

        {/* ===== CUERPO: métricas + sparkline + acciones ===== */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          {/* IZQUIERDA: métricas + sparkline */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {/* Métricas en bloques, sin grid para evitar solapes */}
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div className="flex flex-col min-w-[140px]">
                <span className="text-[var(--color-text-muted)] mr-1">
                  Moneda
                </span>
                <span className="font-medium text-[var(--color-text)]">
                  {moneda}
                </span>
              </div>
              <div className="flex flex-col min-w-[140px]">
                <span className="text-[var(--color-text-muted)]">
                  Balance
                </span>
                <span className="font-medium">{fmt(balance)}</span>
              </div>

              <div className="flex flex-col min-w-[140px]">
                <span className="text-[var(--color-text-muted)]">
                  Disponible
                </span>
                <span className="font-medium">
                  {fmt(balanceDisponible)}
                </span>
              </div>
            </div>

            {/* Sparkline */}
            <div className="mt-1">
              <Sparkline points={sparkline ?? fallback} />
            </div>
          </div>

          {/* DERECHA: columna de acciones */}
          <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto md:items-stretch">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 md:flex-none"
              onClick={() => onView?.(id)}
            >
              <Eye className="w-4 h-4 mr-1" /> Ver
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex-1 md:flex-none"
              onClick={() => onStatus?.(id)}
            >
              <Download className="w-4 h-4 mr-1" /> Estado
            </Button>

            <Button
              className="bg-yellow-400 text-black hover:bg-yellow-500 flex-1 md:flex-none"
              size="sm"
              onClick={() => onOperate?.(id)}
            >
              Operar
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="flex-1 md:flex-none"
              onClick={() => onSelectActive?.(id)}
            >
              Seleccionar activa
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}





