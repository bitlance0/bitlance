import { formatCurrency } from "@/lib/utils";
import { Trade } from "./utils/operationsTypes";
import { fmtDate, getMeta, toNum } from "./utils/operationsHelpers";

const MobileBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ring-white/10">
    {children}
  </span>
);

export function ClosedTradesMobile({
  closedTrades,
  currency,
}: {
  closedTrades: Trade[];
  currency: string;
}) {
  if (closedTrades.length === 0) {
    return <p className="text-sm text-muted mt-4">No hay operaciones cerradas.</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {closedTrades.map((t) => {
        const md = getMeta(t);
        return (
          <div key={t.id} className="rounded-xl border border-white/10 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{t.symbol}</div>
              <MobileBadge>
                <span className={t.side === "buy" ? "text-green-400" : "text-red-400"}>
                  {t.side.toUpperCase()}
                </span>
              </MobileBadge>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-gray-300">
              <div>
                <p className="opacity-60">Cantidad</p>
                <p className="font-medium">{t.quantity}</p>
              </div>
              <div>
                <p className="opacity-60">P. Apertura</p>
                <p className="font-medium">
                  {formatCurrency(toNum(t.entryPrice), "en-US", currency)}
                </p>
              </div>
              <div>
                <p className="opacity-60">P. Cierre</p>
                <p className="font-medium">
                  {t.closePrice ? formatCurrency(toNum(t.closePrice), "en-US", currency) : "—"}
                </p>
              </div>
              <div>
                <p className="opacity-60">Beneficios</p>
                <p className={`font-medium ${toNum(t.profit) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {formatCurrency(toNum(t.profit), "en-US", currency)}
                </p>
              </div>
              <div>
                <p className="opacity-60">Intercambio</p>
                <p className="font-medium">
                  {formatCurrency(toNum(md.swap), "en-US", currency)}
                </p>
              </div>
              <div>
                <p className="opacity-60">Comisión</p>
                <p className="font-medium">
                  {formatCurrency(toNum(md.commission), "en-US", currency)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="opacity-60">Copiado de</p>
                <p className="font-medium">{md.copiedFrom ?? "—"}</p>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-gray-400">
              <div>Abierta: {fmtDate(t.createdAt)}</div>
              <div>Cerrada: {fmtDate(t.closedAt)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
