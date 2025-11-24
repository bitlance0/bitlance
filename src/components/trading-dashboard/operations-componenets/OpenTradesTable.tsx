import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Trade } from "./utils/operationsTypes";

export function OpenTradesTable({
  openTrades,
  livePerf,
  currency,
  onCloseTrade,
}: {
  openTrades: Trade[];
  livePerf: Record<string | number, { price: number; pnl: number; pct: number }>;
  currency: string;
  onCloseTrade: (t: Trade) => Promise<void> | void;
}) {
  if (openTrades.length === 0) {
    return <p className="text-sm text-muted mt-4">No hay operaciones abiertas.</p>;
  }

  return (
    <div className="overflow-x-auto mt-4 hidden md:block">
      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-xs text-[var(--color-text-muted)]">
            <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Instrumento</th>
            <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">TIPO</th>
            <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Importación</th>
            <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Precio de apertura</th>
            <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Precio actual</th>
            <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Leverage</th>
            <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Rendimiento</th>
            <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Rendimiento %</th>
            <th className="pb-2 px-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {openTrades.map((t) => {
            const live = livePerf[t.id] ?? {
              price: Number(t.entryPrice),
              pnl: 0,
              pct: 0,
            };
            const pnlPos = live.pnl >= 0;

            return (
              <tr
                key={t.id}
                className="
                  transition-all duration-200 
                  bg-[var(--table-row-bg)]
                  hover:bg-[var(--table-row-bg)]
                  border border-[var(--color-border)]
                  rounded-lg
                "
              >
                <td className="py-3 px-4 border-r border-[var(--color-border)]/30 first:rounded-l-lg text-[var(--color-text)]">{t.symbol}</td>
                <td className={`py-3 px-4 border-r border-[var(--color-border)]/30 ${t.side === "buy" ? "text-green-400" : "text-red-400"}`}>
                  {t.side.toUpperCase()}
                </td>
                <td className="py-3 px-4 border-r border-[var(--color-border)]/30 text-[var(--color-text)]">{Number(t.quantity)}</td>
                <td className="py-3 px-4 border-r border-[var(--color-border)]/30 text-[var(--color-text)]">
                  {formatCurrency(Number(t.entryPrice), "en-US", currency)}
                </td>
                <td className="py-3 px-4 border-r border-[var(--color-border)]/30 text-[var(--color-text)]">
                  {formatCurrency(live.price, "en-US", currency)}
                </td>
                <td className="py-3 px-4 border-r border-[var(--color-border)]/30 text-[var(--color-text)]">{t.leverage}x</td>
                <td className={`py-3 px-4 border-r border-[var(--color-border)]/30 ${pnlPos ? "text-green-400" : "text-red-400"}`}>
                  {formatCurrency(live.pnl, "en-US", currency)}
                </td>
                <td className={`py-3 px-4 border-r border-[var(--color-border)]/30 ${pnlPos ? "text-green-400" : "text-red-400"}`}>
                  {live.pct.toFixed(2)}%
                </td>
                <td className="py-3 px-4 last:rounded-r-lg">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="ml-2 bg-red-600 hover:bg-red-700 cursor-pointer transition-colors"
                    onClick={() => onCloseTrade(t)}
                  >
                    Cerrar
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
