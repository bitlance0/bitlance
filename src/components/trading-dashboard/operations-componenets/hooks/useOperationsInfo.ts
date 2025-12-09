// src/components/trading-dashboard/operations-componenets/hooks/useOperationsInfo.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUserStore } from "@/stores/useUserStore";
import { useMarketStore } from "@/stores/useMarketStore";
import { Trade, TriggerRule } from "../utils/operationsTypes";
import { sideSign, toNum } from "../utils/operationsHelpers";
import { toast } from "sonner";
import { useConfirm } from "@/components/common/ConfirmDialog";

// función para notificar al panel de operaciones y renderizar cambios
function notifyTradesUpdatedGlobal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("trades:updated"));
  }
}


export function useOperationsInfo() {
  const CURRENCY = "USD";

  const { user, updateUserBalance } = useUserStore();
  const { dataMarket, getLivePrice } = useMarketStore();
  const confirm = useConfirm();

  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [pendingTrades, setPendingTrades] = useState<Trade[]>([]);
  const [expanded, setExpanded] =
    useState<"open" | "closed" | "pending" | null>(null);

  const [metrics, setMetrics] = useState({
    balance: 0,
    usedMargin: 0,
    freeMargin: 0,
    openPnL: 0,
    equity: 0,
    marginLevel: 0,
    credit: 0,
  });

  const [livePerf, setLivePerf] = useState<
    Record<string | number, { price: number; pnl: number; pct: number }>
  >({});

  const [rowsPerPage, setRowsPerPage] = useState(4);
  const [page, setPage] = useState(0);

  /* ------------------------ Precio en vivo con fallbacks ------------------------ */
  function resolveLivePrice(symbol: string, fallback: number) {
    const live = getLivePrice(symbol);
    if (typeof live === "number" && Number.isFinite(live) && live > 0)
      return live;

    const S = symbol.toUpperCase();
    const m = Array.isArray(dataMarket)
      ? (dataMarket as any[]).find((mk: any) =>
          [mk.symbol, mk.ticker, mk.code]
            .filter(Boolean)
            .map((x: any) => String(x).toUpperCase())
            .includes(S)
        )
      : undefined;

    const mPrice = Number(
      (m as any)?.lastPrice ??
        (m as any)?.last ??
        (m as any)?.price ??
        (m as any)?.close ??
        (m as any)?.bid ??
        (m as any)?.ask
    );
    if (Number.isFinite(mPrice) && mPrice > 0) return mPrice;

    return fallback;
  }

  /* ---------------------------------- Fetch ---------------------------------- */
  const fetchTradesAll = async () => {
    if (!user?.id) return;
    const userId = String(user.id);

    try {
      const res = await fetch(
        `/api/trade/list?userId=${encodeURIComponent(
          userId
        )}&status=all&ts=${Date.now()}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "No se pudo cargar la información");
      }

      const rows: Trade[] = data.trades ?? [];
      setOpenTrades(rows.filter((t) => t.status === "open"));
      setClosedTrades(
        rows
          .filter((t) => t.status === "closed")
          .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""))
      );
      setPendingTrades(rows.filter((t) => t.status === "pending"));
    } catch (e: any) {
      console.error("fetchTradesAll:", e);
      toast.error(`Error cargando operaciones: ${e?.message ?? e}`);
    }
  };

  const fetchTradesByStatus = async (status: "open" | "closed" | "all") => {
    if (status === "all") return fetchTradesAll();
    if (!user?.id) return;
    const userId = String(user.id);

    try {
      const res = await fetch(
        `/api/trade/list?userId=${encodeURIComponent(
          userId
        )}&status=${status}&ts=${Date.now()}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "No se pudieron cargar las operaciones");
      }

      const rows: Trade[] = data.trades ?? [];
      if (status === "open") {
        setOpenTrades(rows.filter((t) => t.status === "open"));
      } else if (status === "closed") {
        setClosedTrades(
          rows
            .filter((t) => t.status === "closed")
            .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""))
        );
      }

      const pendingFound = rows.filter((t) => t.status === "pending");
      if (pendingFound.length) {
        setPendingTrades(pendingFound);
      }
    } catch (e: any) {
      console.error("fetchTradesByStatus:", e);
      toast.error(
        `Error cargando ${
          status === "open" ? "abiertas" : status === "closed" ? "cerradas" : "operaciones"
        }: ${e?.message ?? e}`
      );
    }
  };

  useEffect(() => {
    fetchTradesAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 🔁 Re-fetch cuando alguien dispare el evento global "trades:updated"
  useEffect(() => {
    const handler = () => {
      fetchTradesAll();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("trades:updated", handler);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("trades:updated", handler);
      }
    };
    // mismo ciclo de vida que el fetch inicial: cambia solo si cambia el user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


  /* -------------------------------- Métricas -------------------------------- */
  useEffect(() => {
    if (!user) return;

    const balance = Number(user.balance ?? 0);
    let usedMargin = 0;
    let openPnL = 0;

    for (const trade of openTrades) {
      const entry = parseFloat(trade.entryPrice);
      const qty = parseFloat(trade.quantity);
      const leverage = Math.max(parseFloat(trade.leverage ?? "1"), 1);
      const margin = (entry * qty) / leverage;
      usedMargin += margin;

      const currentPrice = resolveLivePrice(trade.symbol, entry);
      const pnl = (currentPrice - entry) * qty * leverage * (trade.side === "buy" ? 1 : -1);
      openPnL += pnl;
    }

    const freeMargin = balance - usedMargin;
    const equity = balance + openPnL;
    const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 0;

    setMetrics({
      balance,
      usedMargin: Number(usedMargin.toFixed(2)),
      freeMargin: Number(freeMargin.toFixed(2)),
      openPnL: Number(openPnL.toFixed(2)),
      equity: Number(equity.toFixed(2)),
      marginLevel: Number(marginLevel.toFixed(2)),
      credit: 0,
    });
  }, [openTrades, dataMarket, getLivePrice, user]);

  /* --------------------------- PnL en vivo (abiertas) --------------------------- */
  useEffect(() => {
    if (!openTrades.length) {
      setLivePerf({});
      return;
    }

    const calc = () => {
      const next: Record<string | number, { price: number; pnl: number; pct: number }> = {};
      for (const t of openTrades) {
        const entry = toNum(t.entryPrice);
        const qty = toNum(t.quantity);
        const lev = Math.max(toNum(t.leverage, 1), 1);
        const dir = sideSign(t.side);

        const price = resolveLivePrice(t.symbol, entry);
        const pnl = (price - entry) * qty * lev * dir;
        const pct = ((price - entry) / (entry || 1)) * 100 * dir;

        next[t.id] = {
          price: Number(price.toFixed(6)),
          pnl: Number(pnl.toFixed(2)),
          pct: Number(pct.toFixed(2)),
        };
      }
      setLivePerf(next);
    };

    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [openTrades, dataMarket, getLivePrice]);

  /* ------------------- Auto-activación de pendientes (anti-spam) ------------------- */
  const ACTIVATION_COOLDOWN_MS = 12_000;
  const MAX_ACTIVATIONS_IN_FLIGHT = 2;
  const PRICE_EPS = 1e-8;

  const inFlightRef = useRef<Set<string | number>>(new Set());
  const lastAttemptRef = useRef<Map<string | number, number>>(new Map());
  const lastMetRef = useRef<Map<string | number, boolean>>(new Map());
  const lastToastRef = useRef<number>(0);

  useEffect(() => {
    if (!pendingTrades.length) return;

    const tick = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      const priceCache = new Map<string, number>();
      const now = Date.now();

      const candidates: Trade[] = [];
      for (const p of pendingTrades) {
        const id = p.id;
        const last = lastAttemptRef.current.get(id) ?? 0;
        if (now - last < ACTIVATION_COOLDOWN_MS) continue;
        if (inFlightRef.current.has(id)) continue;

        const trigger = toNum(p.triggerPrice);
        if (trigger <= 0) continue;

        let live = priceCache.get(p.symbol);
        if (live == null) {
          const fb = toNum(p.entryPrice) || trigger;
          live = resolveLivePrice(p.symbol, fb);
          priceCache.set(p.symbol, live);
        }

        const rule = (p.triggerRule || "gte") as TriggerRule;
        const meets =
          (rule === "gte" && live + PRICE_EPS >= trigger) ||
          (rule === "lte" && live - PRICE_EPS <= trigger);

        const prevMet = lastMetRef.current.get(id) ?? false;
        lastMetRef.current.set(id, meets);

        if (meets && !prevMet) {
          candidates.push(p);
        }
      }

      if (!candidates.length) return;

      const budget = Math.max(
        0,
        MAX_ACTIVATIONS_IN_FLIGHT - inFlightRef.current.size
      );
      const batch = candidates.slice(0, budget);
      if (!batch.length) return;

      await Promise.allSettled(
        batch.map(async (p) => {
          try {
            inFlightRef.current.add(p.id);
            lastAttemptRef.current.set(p.id, Date.now());

            const trigger = toNum(p.triggerPrice);
            const live = (() => {
              const cached = priceCache.get(p.symbol);
              if (cached != null) return cached;
              const fb = toNum(p.entryPrice) || trigger;
              const v = resolveLivePrice(p.symbol, fb);
              priceCache.set(p.symbol, v);
              return v;
            })();

            const res = await fetch("/api/trade/pending/activate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tradeId: p.id, currentPrice: live }),
            });
            const data = await res.json();

            if (!res.ok || !data?.success) {
              if (Date.now() - lastToastRef.current > 2000) {
                toast.error(
                  `No se pudo activar ${p.symbol}: ${data?.error ?? "error"}`
                );
                lastToastRef.current = Date.now();
              }
              return;
            }

            toast.success(`Orden pendiente activada: ${p.symbol} @ ${live.toFixed(4)}`);
            // 👇 avisar globalmente que las operaciones cambiaron y renderizar cambios
            notifyTradesUpdatedGlobal();
            fetchTradesAll();
          } catch (e: any) {
            if (Date.now() - lastToastRef.current > 2000) {
              toast.error(
                `Error activando ${p.symbol}: ${e?.message ?? e}`
              );
              lastToastRef.current = Date.now();
            }
          } finally {
            inFlightRef.current.delete(p.id);
          }
        })
      );
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pendingTrades, dataMarket, getLivePrice]);

  /* --------------------------- API helper para cierre --------------------------- */
  async function apiCloseTrade(
    tradeId: string | number,
    symbol: string,
    entryPrice: string
  ) {
    const fallback = Number.parseFloat(entryPrice || "0");
    const marketPrice = resolveLivePrice(symbol, fallback);
    const closePrice =
      Number.isFinite(marketPrice) && marketPrice > 0 ? marketPrice : fallback;

    const res = await fetch("/api/trade/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId, closePrice }),
    });

    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "Error al cerrar operación");
    }
    return data;
  }

  function mapClosedTrade(trade: Trade, api: any): Trade {
    const payload = api?.trade ?? {};
    return {
      ...trade,
      status: "closed",
      closePrice: String(
        payload.closePrice ?? payload.close_price ?? trade.closePrice ?? ""
      ),
      profit: String(payload.profit ?? trade.profit ?? "0"),
      createdAt: payload.createdAt ?? trade.createdAt ?? null,
      closedAt: payload.closedAt ?? new Date().toISOString(),
      metadata: payload.metadata ?? trade.metadata ?? null,
    };
  }

  /* --------------------------------- Acciones --------------------------------- */
  async function handleCloseTrade(trade: Trade) {
    const ok = await confirm({
      title: `¿Cerrar ${trade.symbol}?`,
      description:
        "Esta acción liquidará la posición al precio de mercado actual. ¿Deseas continuar?",
      confirmText: "Cerrar posición",
      cancelText: "Cancelar",
      destructive: true,
    });
    if (!ok) return;

    try {
      const data = await toast.promise(
        apiCloseTrade(trade.id, trade.symbol, trade.entryPrice),
        {
          loading: `Cerrando ${trade.symbol}…`,
          success: (d) =>
            `Operación cerrada (${trade.symbol}). P/L: ${d?.trade?.profit ?? "—"}`,
          error: (e: any) =>
            `No se pudo cerrar ${trade.symbol}: ${e?.message ?? e}`,
        }
      );

      // ✅ Actualización optimista inmediata de la UI
      setOpenTrades((prev) =>
        prev.filter((t) => String(t.id) !== String(trade.id))
      );
      setClosedTrades((prev) => [mapClosedTrade(trade, data), ...prev]);

      // (opcional) actualizar saldo si tu API lo retorna
      const resp = (data ?? {}) as any;
      const balanceAfter = Number(
        resp?.trade?.newBalance ??
          resp?.newBalance ??
          resp?.trade?.balanceAfter
      );
      if (Number.isFinite(balanceAfter) && updateUserBalance) {
        try {
          updateUserBalance(balanceAfter);
        } catch {
          // ignore
        }
      }
      // 👇 avisar globalmente que las operaciones cambiaron y renderizar cambios
      notifyTradesUpdatedGlobal();

      // Reconciliar con servidor (segundo plano)
      fetchTradesAll();
    } catch {
      // los errores ya se notifican con toast.promise
    }
  }

  async function handleCancelPending(trade: Trade) {
    try {
      const res = await fetch("/api/trade/pending/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId: trade.id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        toast.error(
          `No se pudo cancelar la orden pendiente (${trade.symbol}): ${
            data?.error ?? "error"
          }`
        );
        throw new Error(
          data?.error || "No se pudo cancelar la orden pendiente"
        );
      }
      toast.success(`Pendiente cancelada: ${trade.symbol}`);
      // 👇 avisar globalmente que las operaciones cambiaron y renderizar cambios
      notifyTradesUpdatedGlobal();
      fetchTradesAll();
    } catch (e: any) {
      console.error("cancel pending:", e);
      toast.error(
        `Error cancelando pendiente (${trade.symbol}): ${e?.message ?? e}`
      );
    }
  }

  /* -------------------------------- Acordeones -------------------------------- */
  const toggleOpenAccordion = () =>
    setExpanded((e) => (e === "open" ? null : "open"));
  const toggleClosedAccordion = () =>
    setExpanded((e) => (e === "closed" ? null : "closed"));
  const togglePendingAccordion = () =>
    setExpanded((e) => (e === "pending" ? null : "pending"));

  /* --------------------------- Paginación (cerradas) --------------------------- */
  const closedPaged = useMemo(() => {
    const start = page * rowsPerPage;
    return closedTrades.slice(start, start + rowsPerPage);
  }, [closedTrades, page, rowsPerPage]);

  const totalClosedPL = useMemo(
    () => closedTrades.reduce((acc, t) => acc + toNum(t.profit), 0),
    [closedTrades]
  );

  return {
    CURRENCY,
    openTrades,
    closedTrades,
    pendingTrades,
    livePerf,
    metrics,
    expanded,
    toggleOpenAccordion,
    toggleClosedAccordion,
    togglePendingAccordion,
    fetchTradesByStatus,
    fetchTradesAll,
    handleCloseTrade,
    handleCancelPending,
    rowsPerPage,
    setRowsPerPage,
    page,
    setPage,
    closedPaged,
    totalClosedPL,
  };
}
