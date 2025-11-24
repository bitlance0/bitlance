import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Trade } from "./utils/operationsTypes";
import { getMeta, toNum, fmtDate } from "./utils/operationsHelpers";

export function ClosedTradesTable({
  closedPaged,
  closedTradesCount,
  totalClosedPL,
  rowsPerPage,
  page,
  setRowsPerPage,
  setPage,
  currency,
}: {
  closedPaged: Trade[];
  closedTradesCount: number;
  totalClosedPL: number;
  rowsPerPage: number;
  page: number;
  setRowsPerPage: (n: number) => void;
  setPage: (p: number) => void;
  currency: string;
}) {
  if (closedTradesCount === 0) {
    return <p className="text-sm text-muted mt-4">No hay operaciones cerradas.</p>;
  }

  return (
    <div className="mt-4">
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-sm border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs text-[var(--color-text-muted)]">
              <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Instrumento</th>
              <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">TIPO</th>
              <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Importación</th>
              <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Precio de apertura</th>
              <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Hora de apertura</th>
              <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Precio de cierre</th>
              <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Hora de cierre</th>
              <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Beneficios</th>
              <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Intercambio</th>
              <th className="pb-2 px-4 border-r border-[var(--color-border)]/30 text-center">Comisión</th>
              <th className="pb-2 px-4 text-center">Copiado de</th>
            </tr>
          </thead>
          <tbody>
            {closedPaged.map((t) => {
              const md = getMeta(t);
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
                  <td className="py-3 px-4 border-r border-[var(--color-border)]/30 text-[var(--color-text)]">{formatCurrency(toNum(t.entryPrice), "en-US", currency)}</td>
                  <td className="py-3 px-4 border-r border-[var(--color-border)]/30 text-[var(--color-text)]">{fmtDate(t.createdAt)}</td>
                  <td className="py-3 px-4 border-r border-[var(--color-border)]/30 text-[var(--color-text)]">
                    {t.closePrice ? formatCurrency(toNum(t.closePrice), "en-US", currency) : "—"}
                  </td>
                  <td className="py-3 px-4 border-r border-[var(--color-border)]/30 text-[var(--color-text)]">{fmtDate(t.closedAt)}</td>
                  <td className={`py-3 px-4 border-r border-[var(--color-border)]/30 ${toNum(t.profit) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatCurrency(toNum(t.profit), "en-US", currency)}
                  </td>
                  <td className="py-3 px-4 border-r border-[var(--color-border)]/30 text-[var(--color-text)]">{formatCurrency(toNum(md.swap), "en-US", currency)}</td>
                  <td className="py-3 px-4 border-r border-[var(--color-border)]/30 text-[var(--color-text)]">{formatCurrency(toNum(md.commission), "en-US", currency)}</td>
                  <td className="py-3 px-4 last:rounded-r-lg text-[var(--color-text)]">{md.copiedFrom ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: total + paginación */}
      <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t border-[var(--color-border)]">
        <div className="text-sm font-medium text-[var(--color-text)]">
          Total P/L:&nbsp;
          <span className={`${totalClosedPL >= 0 ? "text-green-400" : "text-red-400"}`}>
            {formatCurrency(totalClosedPL, "en-US", currency)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--color-text-muted)]">Filas por página:</label>
          <select
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] transition-colors"
            value={rowsPerPage}
            onChange={(e) => {
              const n = Number(e.target.value);
              setRowsPerPage(n);
              setPage(0);
            }}
          >
            {[4, 10, 25].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div className="text-sm text-[var(--color-text-muted)] ml-2">
            {closedTradesCount === 0
              ? "0-0 of 0"
              : `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, closedTradesCount)} of ${closedTradesCount}`}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(Math.max(page - 1, 0))}
            className="border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
          >
            {"<"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const hasNext = (page + 1) * rowsPerPage < closedTradesCount;
              setPage(hasNext ? page + 1 : page);
            }}
            className="border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
          >
            {">"}
          </Button>
        </div>
      </div>
    </div>
  );
}
