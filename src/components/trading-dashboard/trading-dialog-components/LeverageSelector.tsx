import React from "react";
import { Badge } from "@/components/ui/badge";

interface LeverageSelectorProps {
  leverage: number;
  allowedLeverages: number[];
  onChange: (lev: number) => void;
  disabled?: boolean;
}

export function LeverageSelector({
  leverage,
  allowedLeverages,
  onChange,
  disabled = false,
}: LeverageSelectorProps) {
  const marginPct = (100 / leverage).toFixed(1);

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-gray-200">
          <span>Apalancamiento</span>
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-400"
          >
            {leverage}x
          </Badge>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Margen requerido: <strong className="text-gray-200">{marginPct}%</strong>
        </span>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-7 gap-1">
        {allowedLeverages.map((lev) => {
          const isSelected = lev === leverage;
          const isHighRisk = lev >= 50;

          return (
            <button
              key={lev}
              type="button"
              disabled={disabled}
              onClick={() => onChange(lev)}
              className={`rounded-md py-1.5 text-xs font-medium transition-all duration-150 ${
                isSelected
                  ? isHighRisk
                    ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-400"
                    : "bg-blue-600 text-white shadow-sm ring-1 ring-blue-400"
                  : "bg-[#1c1d22] text-gray-300 hover:bg-[#282a32] hover:text-white"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {lev}x
            </button>
          );
        })}
      </div>

      {leverage >= 50 && (
        <p className="text-[10px] text-amber-400/90 leading-tight">
          ⚠️ Alto apalancamiento: amplifica ganancias pero acelera el riesgo de liquidación.
        </p>
      )}
    </div>
  );
}
