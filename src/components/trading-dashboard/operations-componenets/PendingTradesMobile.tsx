import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Trade } from "./utils/operationsTypes";
import { fmtDate, toNum } from "./utils/operationsHelpers";

const MobileBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ring-white/10">
    {children}
  </span>
);

export function PendingTradesMobile({
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
    <div className="mt-4 space-y-3">
      {pendingTrades.map((t) => {
        const trg = toNum(t.triggerPrice);
        const rule = t.triggerRule === "lte" ? "≤" : "≥";

        return (
          <div key={t.id} className="rounded-xl border border-white/10 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{t.symbol}</div>
              <MobileBadge>
                <span className="text-amber-400">PENDIENTE</span>
              </MobileBadge>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-gray-300">
              <div>
                <p className="opacity-60">Cantidad</p>
                <p className="font-medium">{t.quantity}</p>
              </div>
              <div>
                <p className="opacity-60">Regla</p>
                <p className="font-medium">
                  {rule} {formatCurrency(trg, "en-US", currency)}
                </p>
              </div>
              <div>
                <p className="opacity-60">Lado</p>
                <p className={`font-medium ${t.side === "buy" ? "text-green-400" : "text-red-400"}`}>
                  {t.side.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="opacity-60">Creada</p>
                <p className="font-medium">{fmtDate(t.createdAt)}</p>
              </div>
            </div>

            <div className="mt-3">
              <Button
                size="sm"
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={() => onCancelPending(t)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
