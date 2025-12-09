// src/components/trading-dashboard/OperationsInfo.tsx
"use client";

import { useEffect, useState } from "react";
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

export default function OperationsInfo() {
  const { isLoading } = useMarketStore();

  const {
    // datos
    openTrades,
    closedTrades,
    pendingTrades,
    livePerf,
    metrics,
    // acordeón y vista
    expanded,
    toggleOpenAccordion,
    toggleClosedAccordion,
    togglePendingAccordion,
    // fetch
    fetchTradesByStatus,
    fetchTradesAll,
    // acciones
    handleCloseTrade,
    handleCancelPending,
    // paginación cerradas
    rowsPerPage,
    setRowsPerPage,
    page,
    setPage,
    closedPaged,
    totalClosedPL,
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

  const [isMobileLayout, setIsMobileLayout] = useState(false);

  // Detecta layout "compacto" por ancho o alto (afecta también zoom)
  useEffect(() => {
    const checkLayout = () => {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Ajusta estos umbrales si lo necesitas
      const mobile = w < 768 || h < 700;
      setIsMobileLayout(mobile);
    };

    checkLayout();
    window.addEventListener("resize", checkLayout);
    return () => window.removeEventListener("resize", checkLayout);
  }, []);

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

      {/* Acordeones / Controles de operaciones */}
      <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
        {/* --- Layout móvil/compacto: chips Abiertas / Pendientes / Cerradas --- */}
        {isMobileLayout && (
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {[
              { key: "open", label: "Abiertas" as const },
              { key: "pending", label: "Pendientes" as const },
              { key: "closed", label: "Cerradas" as const },
            ].map(({ key, label }) => {
              const active = expanded === key;
              return (
                <button
                  key={key}
                  onClick={async () => {
                    // Cargar datos según tipo
                    if (key === "open") await fetchTradesByStatus("open");
                    if (key === "closed") await fetchTradesByStatus("closed");
                    if (key === "pending") await fetchTradesAll();

                    // Cambiar acordeón activo
                    if (expanded === key) return; // ya está abierto
                    if (key === "open") toggleOpenAccordion();
                    if (key === "closed") toggleClosedAccordion();
                    if (key === "pending") togglePendingAccordion();
                  }}
                  className={[
                    "px-3 py-1 text-sm rounded-full border transition-colors duration-200",
                    active
                      ? "bg-[var(--color-primary)] text-[var(--color-bg)] border-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* --- Layout escritorio: botones grandes tipo acordeón --- */}
        {!isMobileLayout && (
          <div className="space-y-2">
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
          </div>
        )}

        {/* ==== CONTENIDO DE LAS TRES SECCIONES ==== */}

        {/* Abiertas */}
        {expanded === "open" && (
          <div className="transition-all duration-300">
            {isMobileLayout ? (
              <div className="p-3">
                {openTrades.length > 0 ? (
                  <OpenTradesMobile
                    openTrades={openTrades}
                    livePerf={livePerf}
                    currency={CURRENCY}
                    onCloseTrade={handleCloseTrade}
                  />
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] text-center">
                    No hay operaciones abiertas.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <OpenTradesTable
                  openTrades={openTrades}
                  livePerf={livePerf}
                  currency={CURRENCY}
                  onCloseTrade={handleCloseTrade}
                />
              </div>
            )}
          </div>
        )}

        {/* Cerradas */}
        {expanded === "closed" && (
          <div className="transition-all duration-300">
            {isMobileLayout ? (
              <div className="p-3">
                {closedTrades.length > 0 ? (
                  <ClosedTradesMobile
                    closedTrades={closedTrades}
                    currency={CURRENCY}
                  />
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] text-center">
                    No hay operaciones cerradas.
                  </p>
                )}
              </div>
            ) : (
              <div>
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
            )}
          </div>
        )}

        {/* Pendientes */}
        {expanded === "pending" && (
          <div className="transition-all duration-300">
            {isMobileLayout ? (
              <div className="p-3">
                {pendingTrades.length > 0 ? (
                  <PendingTradesMobile
                    pendingTrades={pendingTrades}
                    currency={CURRENCY}
                    onCancelPending={handleCancelPending}
                  />
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] text-center">
                    No hay operaciones pendientes.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <PendingTradesTable
                  pendingTrades={pendingTrades}
                  currency={CURRENCY}
                  onCancelPending={handleCancelPending}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
