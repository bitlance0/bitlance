import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Trade } from "./utils/operationsTypes";

const MobileBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ring-white/10">
    {children}
  </span>
);

export function OpenTradesMobile({
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
    <div className="mt-4 space-y-3">
      {openTrades.map((t) => {
        const live = livePerf[t.id] ?? {
          price: Number(t.entryPrice),
          pnl: 0,
          pct: 0,
        };
        const pnlPos = live.pnl >= 0;

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
                <p className="opacity-60">Entrada</p>
                <p className="font-medium">
                  {formatCurrency(Number(t.entryPrice), "en-US", currency)}
                </p>
              </div>
              <div>
                <p className="opacity-60">Precio actual</p>
                <p className="font-medium">
                  {formatCurrency(live.price, "en-US", currency)}
                </p>
              </div>
              <div>
                <p className="opacity-60">Leverage</p>
                <p className="font-medium">{t.leverage}x</p>
              </div>
              <div className="col-span-2">
                <p className="opacity-60">Rendimiento</p>
                <p className={`font-medium ${pnlPos ? "text-green-400" : "text-red-400"}`}>
                  {formatCurrency(live.pnl, "en-US", currency)}&nbsp;({live.pct.toFixed(2)}%)
                </p>
              </div>
            </div>

            <div className="mt-3">
              <Button
                size="sm"
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={() => onCloseTrade(t)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
