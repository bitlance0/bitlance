import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Trade } from "./utils/operationsTypes";
import { fmtDate, toNum } from "./utils/operationsHelpers";

export function PendingTradesTable({
  pendingTrades,
  currency,
  onCancelPending,
}: {
  pendingTrades: Trade[];
  currency: string;
  onCancelPending: (t: Trade) => Promise<void> | void;
}) {
  if (!pendingTrades.length) {
    return <p className="text-sm text-muted mt-4">No hay órdenes pendientes.</p>;
  }

  return (
    <div className="overflow-x-auto mt-4 hidden md:block">
      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-xs text-[var(--color-text-muted)]">
            <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Instrumento</th>
            <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">TIPO</th>
            <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Cantidad</th>
            <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Condición</th>
            <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Creada</th>
            <th className="pb-2 px-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pendingTrades.map((t) => {
            const trg = toNum(t.triggerPrice);
            const rule = t.triggerRule === "lte" ? "≤" : "≥";

            return (
              <tr
                key={t.id}
                className="
                  transition-all duration-200 
                  bg-[var(--table-row-bg)]
                  hover:bg-[var(--table-row-hover)]
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
                  {rule} {formatCurrency(trg, "en-US", currency)}
                </td>
                <td className="py-3 px-4 border-r border-[var(--color-border)]/30 text-[var(--color-text)]">{fmtDate(t.createdAt)}</td>
                <td className="py-3 px-4 last:rounded-r-lg">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="ml-2 bg-red-600 hover:bg-red-700 cursor-pointer transition-colors"
                    onClick={() => onCancelPending(t)}
                  >
                    Cancelar
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
