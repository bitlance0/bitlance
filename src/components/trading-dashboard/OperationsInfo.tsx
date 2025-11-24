"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useMarketStore } from "@/stores/useMarketStore";
import { useOperationsInfo } from "./operations-componenets/hooks/useOperationsInfo";
import { AccountMetrics } from "./operations-componenets/AccountMetrics";
import { AccordionControls } from "./operations-componenets/AccordionControls";
import { OpenTradesMobile } from "./operations-componenets/OpenTradesMobile";
import { OpenTradesTable } from "./operations-componenets/OpenTradesTable";
import { ClosedTradesMobile } from "./operations-componenets/ClosedTradesMobile";
import { ClosedTradesTable } from "./operations-componenets/ClosedTradesTable";
import { PendingTradesMobile } from "./operations-componenets/PendingTradesMobile";
import { PendingTradesTable } from "./operations-componenets/PendingTradesTable";
// import { ConfirmProvider } from "../common/ConfirmDialog";

export default function OperationsInfo() {
  const { isLoading } = useMarketStore();

  const {
    // datos
    openTrades, closedTrades, pendingTrades, livePerf, metrics,
    // acordeón y vista
    expanded, toggleOpenAccordion, toggleClosedAccordion, togglePendingAccordion,
    // fetch
    fetchTradesByStatus, fetchTradesAll,
    // acciones
    handleCloseTrade, handleCancelPending,
    // paginación cerradas
    rowsPerPage, setRowsPerPage, page, setPage, closedPaged, totalClosedPL,
    // helpers
    CURRENCY,
  } = useOperationsInfo();

  const accountData = [
    { label: "Patrimonio neto", value: metrics.equity },
    { label: "Margen libre", value: metrics.freeMargin },
    { label: "Margen usado", value: metrics.usedMargin },
    { label: "P/L abiertas", value: metrics.openPnL },
    { label: "Saldo", value: metrics.balance },
    { label: "Nvl margen (%)", value: metrics.marginLevel },
    { label: "Crédito", value: metrics.credit },
  ];

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 md:p-6 transition-colors">
      {/* Header + métricas */}
      <h2 className="text-base md:text-lg font-semibold mb-4 text-[var(--color-text)] border-l-4 border-[var(--color-primary)] pl-2">
        Información de cuenta
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-y-4 gap-x-4 md:gap-x-6">
        {isLoading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20 md:w-24 mb-2 bg-[var(--color-border)]" />
              <Skeleton className="h-4 w-14 md:w-16 bg-[var(--color-border)]" />
            </div>
          ))
        ) : (
          <AccountMetrics items={accountData} currency={CURRENCY} />
        )}
      </div>

      {/* Acordeones */}
      <div className="mt-6 pt-4 border-t border-[var(--color-border)] space-y-2">
        <AccordionControls
          expanded={expanded}
          onToggleOpen={async () => {
            await fetchTradesByStatus("open");
            toggleOpenAccordion();
          }}
          onToggleClosed={async () => {
            await fetchTradesByStatus("closed");
            toggleClosedAccordion();
          }}
          onTogglePending={async () => {
            await fetchTradesAll();
            togglePendingAccordion();
          }}
          showPending
        />

        {/* ABiertas */}
        {expanded === "open" && (
          <div className="transition-all duration-300">
            <div className="md:hidden p-3">
              <OpenTradesMobile
                openTrades={openTrades}
                livePerf={livePerf}
                currency={CURRENCY}
                onCloseTrade={handleCloseTrade}
              />
            </div>
            <div className="hidden md:block">
              <OpenTradesTable
                openTrades={openTrades}
                livePerf={livePerf}
                currency={CURRENCY}
                onCloseTrade={handleCloseTrade}
              />
            </div>
          </div>
        )}

        {/* Cerradas */}
        {expanded === "closed" && (
          <div className="transition-all duration-300">
            <div className="md:hidden p-3">
              <ClosedTradesMobile
                closedTrades={closedTrades}
                currency={CURRENCY}
              />
            </div>
            <div className="hidden md:block">
              <ClosedTradesTable
                closedPaged={closedPaged}
                closedTradesCount={closedTrades.length}
                totalClosedPL={totalClosedPL}
                rowsPerPage={rowsPerPage}
                page={page}
                setRowsPerPage={setRowsPerPage}
                setPage={setPage}
                currency={CURRENCY}
              />
            </div>
          </div>
        )}

        {/* Pendientes */}
        {expanded === "pending" && (
          <div className="transition-all duration-300">
            <div className="md:hidden p-3">
              <PendingTradesMobile
                pendingTrades={pendingTrades}
                currency={CURRENCY}
                onCancelPending={handleCancelPending}
              />
            </div>
            <div className="hidden md:block">
              <PendingTradesTable
                pendingTrades={pendingTrades}
                currency={CURRENCY}
                onCancelPending={handleCancelPending}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
