"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Landmark,
  Loader2,
  ReceiptText,
  Wallet,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { WithdrawalReceiptModal } from "@/components/withdrawals/WithdrawalReceiptModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getWithdrawalMethodLabel,
  type WithdrawalMethod,
  WITHDRAWAL_METHODS,
} from "@/lib/withdrawal-shared";

type Movimiento = {
  id: string;
  tipo: string;
  monto: number;
  fecha: string;
  currency: string;
  status: string;
  userName?: string | null;
  userEmail?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

type ApiResponse = {
  items: Movimiento[];
  nextOffset: number;
  hasMore: boolean;
};

type ReviewDraft = {
  note: string;
  payoutMethod: WithdrawalMethod;
};

type FilterOverrides = Partial<{
  filtroTipo: "todos" | "depositos" | "retiros" | "ajustes";
  filtroEstado: "todos" | "pending" | "completed" | "failed";
  busquedaUsuario: string;
  dateFrom: string;
  dateTo: string;
  filtroMoneda: "todas" | "USD" | "COP";
  filtroCuentaId: string;
}>;

const PAGE_SIZE = 10;

function formatFecha(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFechaHora(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("es-ES");
}

function formatMoney(value: number) {
  return Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseFetchError(payload: any, status: number) {
  return (
    payload?.detail ||
    payload?.error ||
    `No se pudo completar la solicitud (${status}).`
  );
}

function getMethodIcon(method?: string | null) {
  if (method === "bank_transfer") return Landmark;
  if (method === "cash") return FileText;
  return Wallet;
}

function getStatusBadgeClass(status?: string | null) {
  if (status === "completed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "failed") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (status === "pending") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  return "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]";
}

function getSummaryBadgeClass(active: boolean, tone: "green" | "red" | "purple") {
  if (tone === "green") {
    return active
      ? "border-emerald-400 bg-emerald-500 text-slate-950"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (tone === "red") {
    return active
      ? "border-red-400 bg-red-500 text-white"
      : "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return active
    ? "border-fuchsia-400 bg-fuchsia-500 text-white"
    : "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300";
}

export default function AdminMovimientosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisionLoadingId, setDecisionLoadingId] = useState<string | null>(
    null
  );
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>(
    {}
  );

  const [filtroTipo, setFiltroTipo] = useState<
    "todos" | "depositos" | "retiros" | "ajustes"
  >("todos");
  const [filtroEstado, setFiltroEstado] = useState<
    "todos" | "pending" | "completed" | "failed"
  >("todos");
  const [busquedaUsuario, setBusquedaUsuario] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtroMoneda, setFiltroMoneda] = useState<"todas" | "USD" | "COP">(
    "todas"
  );
  const [filtroCuentaId, setFiltroCuentaId] = useState("");
  const [activo, setActivo] = useState<string | null>(null);
  const [receiptMovimientoId, setReceiptMovimientoId] = useState<string | null>(
    null
  );
  const [receiptOpen, setReceiptOpen] = useState(false);

  async function applyServerFilters(next?: FilterOverrides) {
    if (next?.filtroTipo !== undefined) {
      setFiltroTipo(next.filtroTipo);
    }
    if (next?.filtroEstado !== undefined) {
      setFiltroEstado(next.filtroEstado);
    }

    setOffset(0);
    setActivo(null);
    await loadMovimientos(true, next);
  }

  function isAdminAdjustment(m: Movimiento) {
    return m.metadata?.source === "admin_adjustment";
  }

  function isWithdrawalRequest(m: Movimiento) {
    return (
      m.metadata?.source === "user_withdrawal_request" &&
      (m.tipo || "").toLowerCase().includes("reti")
    );
  }

  function isNegative(m: Movimiento) {
    const tipoLower = (m.tipo || "").toLowerCase();
    const dir = String(m.metadata?.direction || "").toUpperCase();
    const metaTipo = String(m.metadata?.tipo || "").toUpperCase();

    if (tipoLower.includes("retiro")) return true;
    if (tipoLower.includes("cargo")) return true;
    if (dir === "CARGO") return true;
    if (metaTipo === "CARGO") return true;

    return false;
  }

  function isApprovedWithdrawal(m: Movimiento) {
    if (!isWithdrawalRequest(m)) return false;

    const reviewDecision = String(m.metadata?.reviewDecision || "");
    return m.status === "completed" || reviewDecision === "approved";
  }

  function classifyTipo(
    m: Movimiento
  ): "deposito" | "retiro" | "ajuste" | "otro" {
    if (isAdminAdjustment(m)) return "ajuste";

    const tipoLower = (m.tipo || "").toLowerCase();
    if (tipoLower.includes("dep")) return "deposito";
    if (tipoLower.includes("reti")) return "retiro";

    return "otro";
  }

  function getReviewDraft(movimiento: Movimiento): ReviewDraft {
    const stored = reviewDrafts[movimiento.id];
    if (stored) return stored;

    const payoutMethod =
      typeof movimiento.metadata?.payoutMethod === "string" &&
      (movimiento.metadata?.payoutMethod === "wallet" ||
        movimiento.metadata?.payoutMethod === "bank_transfer" ||
        movimiento.metadata?.payoutMethod === "cash")
        ? (movimiento.metadata.payoutMethod as WithdrawalMethod)
        : "wallet";

    return {
      note:
        typeof movimiento.metadata?.adminNote === "string"
          ? movimiento.metadata.adminNote
          : "",
      payoutMethod,
    };
  }

  function updateReviewDraft(
    movimientoId: string,
    patch: Partial<ReviewDraft>,
    sourceMovimiento?: Movimiento
  ) {
    setReviewDrafts((prev) => {
      const base =
        prev[movimientoId] ??
        (sourceMovimiento
          ? getReviewDraft(sourceMovimiento)
          : { note: "", payoutMethod: "wallet" as WithdrawalMethod });

      return {
        ...prev,
        [movimientoId]: {
          ...base,
          ...patch,
        },
      };
    });
  }

  async function loadMovimientos(initial = false, overrides?: FilterOverrides) {
    try {
      setError(null);
      if (initial) setLoading(true);
      else setLoadingMore(true);

      const currentOffset = initial ? 0 : offset;
      const params = new URLSearchParams();
      params.set("limit", PAGE_SIZE.toString());
      params.set("offset", currentOffset.toString());

      const nextFiltroTipo = overrides?.filtroTipo ?? filtroTipo;
      const nextFiltroEstado = overrides?.filtroEstado ?? filtroEstado;
      const nextBusquedaUsuario =
        overrides?.busquedaUsuario ?? busquedaUsuario;
      const nextDateFrom = overrides?.dateFrom ?? dateFrom;
      const nextDateTo = overrides?.dateTo ?? dateTo;
      const nextFiltroMoneda = overrides?.filtroMoneda ?? filtroMoneda;
      const nextFiltroCuentaId = overrides?.filtroCuentaId ?? filtroCuentaId;

      if (nextFiltroTipo !== "todos") params.set("tipo", nextFiltroTipo);
      if (nextFiltroEstado !== "todos") {
        params.set("estado", nextFiltroEstado);
      }
      if (nextBusquedaUsuario.trim()) {
        params.set("q", nextBusquedaUsuario.trim());
      }
      if (nextDateFrom) params.set("from", nextDateFrom);
      if (nextDateTo) params.set("to", nextDateTo);
      if (nextFiltroMoneda !== "todas") {
        params.set("currency", nextFiltroMoneda);
      }
      if (nextFiltroCuentaId.trim()) {
        params.set("accountId", nextFiltroCuentaId.trim());
      }

      const res = await fetch(`/api/admin/movimientos?${params.toString()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(parseFetchError(payload, res.status));
      }

      const data = payload as ApiResponse;
      if (initial) setMovimientos(data.items);
      else setMovimientos((prev) => [...prev, ...data.items]);

      setOffset(data.nextOffset ?? currentOffset + data.items.length);
      setHasMore(Boolean(data.hasMore));
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al cargar movimientos");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    void loadMovimientos(true);
  }, []);

  useEffect(() => {
    if (!receiptMovimientoId) return;

    const exists = movimientos.some((item) => item.id === receiptMovimientoId);
    if (!exists) {
      setReceiptOpen(false);
      setReceiptMovimientoId(null);
    }
  }, [movimientos, receiptMovimientoId]);

  const toggleMovimiento = (id: string) => {
    setActivo((prev) => (prev === id ? null : id));
  };

  async function processWithdrawal(
    withdrawalId: string,
    decision: "approve" | "reject",
    movimiento: Movimiento
  ) {
    const draft = getReviewDraft(movimiento);

    try {
      setDecisionLoadingId(withdrawalId);
      const res = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision,
          note: draft.note,
          payoutMethod: draft.payoutMethod,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(parseFetchError(payload, res.status));
      }

      const reviewedAt = new Date().toISOString();
      const reviewedByName =
        typeof payload?.reviewedByName === "string"
          ? payload.reviewedByName
          : "Administrador";
      const reviewedBy =
        typeof payload?.reviewedBy === "string" ? payload.reviewedBy : null;
      const nextMovimiento: Movimiento = {
        ...movimiento,
        status: decision === "approve" ? "completed" : "failed",
        metadata: {
          ...(movimiento.metadata ?? {}),
          payoutMethod: draft.payoutMethod,
          payoutMethodLabel: getWithdrawalMethodLabel(draft.payoutMethod),
          reviewDecision: decision === "approve" ? "approved" : "rejected",
          reviewedAt,
          reviewedBy,
          reviewedByName,
          adminNote: draft.note || null,
        },
      };

      setMovimientos((prev) =>
        prev.map((item) => (item.id === withdrawalId ? nextMovimiento : item))
      );

      if (decision === "approve") {
        setReceiptMovimientoId(withdrawalId);
        setReceiptOpen(true);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("withdrawals:changed"));
      }
    } catch (e: any) {
      setError(e.message || "No se pudo actualizar el retiro");
      void loadMovimientos(true);
    } finally {
      setDecisionLoadingId(null);
    }
  }

  const movimientosAgrupados = useMemo(() => {
    const map = new Map<string, Movimiento[]>();

    for (const m of movimientos) {
      const d = new Date(m.fecha);
      const key = Number.isNaN(d.getTime())
        ? "fecha-desconocida"
        : d.toISOString().slice(0, 10);

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }

    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [movimientos]);

  const receiptMovimiento =
    movimientos.find((item) => item.id === receiptMovimientoId) ?? null;

  if (loading && movimientos.length === 0) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-bold text-yellow-500">
            Admin Movimientos
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Revisa los ultimos movimientos financieros.
          </p>
        </header>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
        </div>
      </div>
    );
  }

  const entradasCount = movimientos.filter((m) => !isNegative(m)).length;
  const salidasCount = movimientos.filter((m) => isNegative(m)).length;
  const ajustesCount = movimientos.filter((m) => isAdminAdjustment(m)).length;
  const tipoResumenActivo =
    filtroTipo === "depositos" ||
    filtroTipo === "retiros" ||
    filtroTipo === "ajustes"
      ? filtroTipo
      : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">
            Admin Movimientos
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Ultimas transacciones registradas. Los filtros aplican en servidor.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() =>
              void applyServerFilters({
                filtroTipo:
                  tipoResumenActivo === "depositos" ? "todos" : "depositos",
              })
            }
          >
            <Badge
              className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${getSummaryBadgeClass(
                tipoResumenActivo === "depositos",
                "green"
              )}`}
            >
              Entradas: {entradasCount}
            </Badge>
          </button>
          <button
            type="button"
            onClick={() =>
              void applyServerFilters({
                filtroTipo:
                  tipoResumenActivo === "retiros" ? "todos" : "retiros",
              })
            }
          >
            <Badge
              className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${getSummaryBadgeClass(
                tipoResumenActivo === "retiros",
                "red"
              )}`}
            >
              Salidas: {salidasCount}
            </Badge>
          </button>
          <button
            type="button"
            onClick={() =>
              void applyServerFilters({
                filtroTipo: tipoResumenActivo === "ajustes" ? "todos" : "ajustes",
              })
            }
          >
            <Badge
              className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${getSummaryBadgeClass(
                tipoResumenActivo === "ajustes",
                "purple"
              )}`}
            >
              Ajustes admin: {ajustesCount}
            </Badge>
          </button>
        </div>
      </header>

      <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Filtros (DB)
          </span>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Tipo
              </span>
              <select
                className="h-8 rounded-md border bg-[var(--color-surface)] px-2 text-xs"
                value={filtroTipo}
                onChange={(e) =>
                  setFiltroTipo(e.target.value as typeof filtroTipo)
                }
              >
                <option value="todos">Todos</option>
                <option value="depositos">Depositos</option>
                <option value="retiros">Retiros</option>
                <option value="ajustes">Ajustes admin</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Estado
              </span>
              <select
                className="h-8 rounded-md border bg-[var(--color-surface)] px-2 text-xs"
                value={filtroEstado}
                onChange={(e) =>
                  setFiltroEstado(e.target.value as typeof filtroEstado)
                }
              >
                <option value="todos">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="completed">Completado</option>
                <option value="failed">Fallido</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Moneda
              </span>
              <select
                className="h-8 rounded-md border bg-[var(--color-surface)] px-2 text-xs"
                value={filtroMoneda}
                onChange={(e) =>
                  setFiltroMoneda(e.target.value as "todas" | "USD" | "COP")
                }
              >
                <option value="todas">Todas</option>
                <option value="USD">USD</option>
                <option value="COP">COP</option>
              </select>
            </div>

            <div className="flex min-w-[150px] items-center gap-2">
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Cuenta
              </span>
              <Input
                className="h-8 text-xs"
                placeholder="ID de cuenta"
                value={filtroCuentaId}
                onChange={(e) => setFiltroCuentaId(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Desde
              </span>
              <Input
                type="date"
                className="h-8 text-xs"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Hasta
              </span>
              <Input
                type="date"
                className="h-8 text-xs"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="flex min-w-[180px] items-center gap-2">
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Usuario
              </span>
              <Input
                className="h-8 text-xs"
                placeholder="Nombre o email..."
                value={busquedaUsuario}
                onChange={(e) => setBusquedaUsuario(e.target.value)}
              />
            </div>

            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                className="px-3 text-xs"
                disabled={loading}
                onClick={() => {
                  setOffset(0);
                  void loadMovimientos(true);
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  "Aplicar filtros"
                )}
              </Button>
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </section>

      <section className="space-y-4">
        {movimientosAgrupados.length === 0 && !loading && !error && (
          <div className="py-10 text-center text-sm text-[var(--color-text-muted)]">
            No se encontraron movimientos.
          </div>
        )}

        {movimientosAgrupados.map(([fechaKey, items]) => {
          const fechaLabel =
            fechaKey === "fecha-desconocida"
              ? "Fecha desconocida"
              : formatFecha(fechaKey);

          return (
            <div key={fechaKey} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {fechaLabel}
                </h2>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {items.length} movimiento(s)
                </span>
              </div>

              {items.map((m) => {
                const negativo = isNegative(m);
                const ajuste = isAdminAdjustment(m);
                const claseTipo = classifyTipo(m);
                const withdrawalRequest = isWithdrawalRequest(m);
                const pendingApproval =
                  withdrawalRequest && m.status === "pending";
                const montoAbsoluto = Math.abs(m.monto ?? 0);
                const signChar = negativo ? "-" : "+";
                const meta = m.metadata || {};
                const accountId = meta.accountId as string | undefined;
                const userId = m.userId || ((meta.userId as string) ?? null);
                const reviewDecision = meta.reviewDecision as string | undefined;
                const adminNote = meta.adminNote as string | undefined;
                const reviewedAt = meta.reviewedAt as string | undefined;
                const reviewedByName =
                  typeof meta.reviewedByName === "string"
                    ? meta.reviewedByName
                    : null;
                const accountName =
                  typeof meta.accountName === "string" ? meta.accountName : null;
                const accountNumber =
                  typeof meta.accountNumber === "string"
                    ? meta.accountNumber
                    : null;
                const motivo =
                  typeof meta.motivo === "string" ? meta.motivo : null;
                const payoutMethod =
                  typeof meta.payoutMethod === "string"
                    ? meta.payoutMethod
                    : null;
                const destinationAddress =
                  typeof meta.destinationAddress === "string"
                    ? meta.destinationAddress
                    : null;
                const withdrawalReference =
                  typeof meta.withdrawalReference === "string"
                    ? meta.withdrawalReference
                    : null;
                const ticketReference =
                  typeof meta.ticketReference === "string"
                    ? meta.ticketReference
                    : null;
                const MethodIcon = getMethodIcon(payoutMethod);
                const draft = getReviewDraft(m);

                const headerColor = negativo
                  ? ajuste
                    ? "text-purple-300"
                    : "text-red-400"
                  : ajuste
                  ? "text-purple-300"
                  : "text-green-400";

                const Icon = negativo ? ArrowUpCircle : ArrowDownCircle;

                let tipoLabel = m.tipo || "Movimiento";
                if (ajuste) {
                  const mt = String(meta.tipo || "").toUpperCase();
                  tipoLabel =
                    mt === "ABONO"
                      ? "Ajuste admin · Abono"
                      : mt === "CARGO"
                      ? "Ajuste admin · Cargo"
                      : "Ajuste administrativo";
                } else if (withdrawalRequest) {
                  tipoLabel = "Solicitud de retiro";
                }

                return (
                  <div
                    key={m.id}
                    className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] transition-all"
                  >
                    <button
                      onClick={() => toggleMovimiento(m.id)}
                      className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[var(--color-surface)]"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`${headerColor} h-5 w-5`} />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">{tipoLabel}</p>

                            {ajuste && (
                              <Badge className="border-fuchsia-500/30 bg-fuchsia-500/10 text-[10px] text-fuchsia-300">
                                Ajuste admin
                              </Badge>
                            )}

                            {claseTipo === "deposito" && !ajuste && (
                              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-300">
                                Deposito
                              </Badge>
                            )}

                            {/* {claseTipo === "retiro" && !ajuste && (
                              <Badge className="border-red-500/30 bg-red-500/10 text-[10px] text-red-300">
                                Retiro
                              </Badge>
                            )}

                            {withdrawalRequest && (
                              <Badge className="border-yellow-500/30 bg-yellow-500/10 text-[10px] text-yellow-300">
                                Flujo usuario
                              </Badge>
                            )} */}

                            <Badge
                              className={`text-[10px] capitalize ${getStatusBadgeClass(
                                m.status
                              )}`}
                            >
                              {m.status || "desconocido"}
                            </Badge>
                          </div>

                          <span className="text-[11px] text-[var(--color-text-muted)]">
                            {m.userName || "Usuario desconocido"}
                            {m.userEmail && (
                              <span className="text-[10px]"> · {m.userEmail}</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isApprovedWithdrawal(m) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReceiptMovimientoId(m.id);
                              setReceiptOpen(true);
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 transition-colors hover:bg-emerald-500/20"
                            title="Ver tirilla"
                            aria-label="Ver tirilla"
                          >
                            <ReceiptText className="h-4 w-4" />
                          </button>
                        )}
                        <span className={`text-sm font-bold ${headerColor}`}>
                          {signChar}
                          {formatMoney(montoAbsoluto)} {m.currency || "USD"}
                        </span>
                        {activo === m.id ? (
                          <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
                        )}
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {activo === m.id && (
                        <motion.div
                          key="contenido"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-[var(--color-border)] bg-[var(--color-surface)]"
                        >
                          <div className="space-y-4 p-5 text-xs">
                            <div className="flex flex-wrap justify-between gap-3">
                              <div>
                                <span className="text-[var(--color-text-muted)]">
                                  Fecha y hora:
                                </span>
                                <div className="font-medium">
                                  {formatFechaHora(m.fecha)}
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-[var(--color-text-muted)]">
                                  Usuario:
                                </span>
                                <div className="font-medium">
                                  {m.userName || "—"}
                                </div>
                                {m.userEmail && (
                                  <div className="text-[11px] text-[var(--color-text-muted)]">
                                    {m.userEmail}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              {accountName && (
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Cuenta:
                                  </span>
                                  <div className="font-medium">
                                    {accountName}
                                  </div>
                                </div>
                              )}

                              {accountNumber && (
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Numero de cuenta:
                                  </span>
                                  <div className="font-medium">
                                    {accountNumber}
                                  </div>
                                </div>
                              )}

                              {withdrawalReference && (
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Referencia:
                                  </span>
                                  <div className="font-mono text-[11px]">
                                    {withdrawalReference}
                                  </div>
                                </div>
                              )}

                              {ticketReference && (
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Ticket:
                                  </span>
                                  <div className="inline-flex items-center gap-2 font-mono text-[11px]">
                                    <FileText className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                                    {ticketReference}
                                  </div>
                                </div>
                              )}

                              {destinationAddress && (
                                <div className="md:col-span-2">
                                  <span className="text-[var(--color-text-muted)]">
                                    Direccion de salida:
                                  </span>
                                  <div className="font-mono text-[11px]">
                                    {destinationAddress}
                                  </div>
                                </div>
                              )}

                              {motivo && (
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Motivo:
                                  </span>
                                  <div className="font-medium">{motivo}</div>
                                </div>
                              )}

                              {typeof meta.oldBalance === "number" &&
                                typeof meta.newBalance === "number" && (
                                  <div>
                                    <span className="text-[var(--color-text-muted)]">
                                      Balance cuenta:
                                    </span>
                                    <div className="font-medium">
                                      {formatMoney(meta.oldBalance)} →{" "}
                                      {formatMoney(meta.newBalance)}
                                    </div>
                                  </div>
                                )}

                              {typeof meta.oldUserBalance === "number" &&
                                typeof meta.newUserBalance === "number" && (
                                  <div>
                                    <span className="text-[var(--color-text-muted)]">
                                      Balance global usuario:
                                    </span>
                                    <div className="font-medium">
                                      {formatMoney(meta.oldUserBalance)} →{" "}
                                      {formatMoney(meta.newUserBalance)}
                                    </div>
                                  </div>
                                )}

                              <div>
                                <span className="text-[var(--color-text-muted)]">
                                  Metodo de retiro:
                                </span>
                                <div className="inline-flex items-center gap-2 font-medium">
                                  <MethodIcon className="h-4 w-4 text-[var(--color-primary)]" />
                                  {getWithdrawalMethodLabel(payoutMethod)}
                                </div>
                              </div>

                              {reviewDecision && (
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Decision admin:
                                  </span>
                                  <div className="font-medium capitalize">
                                    {reviewDecision === "approved"
                                      ? "Aprobado"
                                      : "Rechazado"}
                                  </div>
                                </div>
                              )}

                              {reviewedAt && (
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Revisado:
                                  </span>
                                  <div className="font-medium">
                                    {formatFechaHora(reviewedAt)}
                                  </div>
                                </div>
                              )}

                              {reviewedByName && (
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Operado por:
                                  </span>
                                  <div className="font-medium">
                                    {reviewedByName}
                                  </div>
                                </div>
                              )}

                              {adminNote && (
                                <div className="md:col-span-2">
                                  <span className="text-[var(--color-text-muted)]">
                                    Observaciones:
                                  </span>
                                  <div className="font-medium">{adminNote}</div>
                                </div>
                              )}

                              {accountId && (
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Cuenta asociada:
                                  </span>
                                  <div className="font-mono text-[11px]">
                                    {accountId}
                                  </div>
                                </div>
                              )}
                            </div>

                            {pendingApproval && (
                              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-yellow-300">
                                      Panel de revision de retiro
                                    </p>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                      Define el metodo de salida y registra una
                                      observacion antes de aprobar o rechazar.
                                    </p>
                                  </div>
                                  <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-300">
                                    Pendiente
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
                                      Metodo de retiro
                                    </label>
                                    <Select
                                      value={draft.payoutMethod}
                                      onValueChange={(value) =>
                                        updateReviewDraft(
                                          m.id,
                                          {
                                            payoutMethod:
                                              value as WithdrawalMethod,
                                          },
                                          m
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-full bg-[var(--color-bg)]">
                                        <SelectValue placeholder="Selecciona metodo" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {WITHDRAWAL_METHODS.map((method) => (
                                          <SelectItem
                                            key={method.value}
                                            value={method.value}
                                          >
                                            {method.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
                                      Ticket de salida
                                    </label>
                                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-xs">
                                      {ticketReference ?? "Se asigno al crear la solicitud"}
                                    </div>
                                  </div>

                                  <div className="space-y-2 md:col-span-2">
                                    <label className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
                                      Observaciones
                                    </label>
                                    <Textarea
                                      value={draft.note}
                                      onChange={(e) =>
                                        updateReviewDraft(
                                          m.id,
                                          { note: e.target.value },
                                          m
                                        )
                                      }
                                      placeholder="Ej. validado con tesoreria, salida programada para el cierre bancario, pago en wallet confirmado..."
                                      className="min-h-28 resize-none bg-[var(--color-bg)]"
                                    />
                                  </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                                    disabled={decisionLoadingId === m.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void processWithdrawal(m.id, "approve", m);
                                    }}
                                  >
                                    {decisionLoadingId === m.id ? (
                                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                                    )}
                                    Aprobar retiro
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                                    disabled={decisionLoadingId === m.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void processWithdrawal(m.id, "reject", m);
                                    }}
                                  >
                                    {decisionLoadingId === m.id ? (
                                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <XCircle className="mr-2 h-3.5 w-3.5" />
                                    )}
                                    Rechazar retiro
                                  </Button>
                                </div>
                              </div>
                            )}

                            {accountId && userId && (
                              <div className="flex justify-end pt-2">
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="border-yellow-500/40 bg-yellow-500/10 text-[11px] text-yellow-200 hover:bg-yellow-500/20 hover:text-yellow-100"
                                >
                                  <Link
                                    href={`/admin/usuarios/${userId}?cuentaId=${accountId}`}
                                  >
                                    Ver cuenta en panel admin
                                  </Link>
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      {hasMore && (
        <div className="flex justify-center py-6">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={() => void loadMovimientos(false)}
            className="px-4 text-xs"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando...
              </>
            ) : (
              "Cargar 10 mas"
            )}
          </Button>
        </div>
      )}

      <WithdrawalReceiptModal
        open={receiptOpen}
        onOpenChange={(open) => {
          setReceiptOpen(open);
          if (!open) {
            setReceiptMovimientoId(null);
          }
        }}
        data={
          receiptMovimiento
            ? {
                id: receiptMovimiento.id,
                amount: receiptMovimiento.monto,
                currency: receiptMovimiento.currency,
                status: receiptMovimiento.status,
                accountName:
                  typeof receiptMovimiento.metadata?.accountName === "string"
                    ? receiptMovimiento.metadata.accountName
                    : null,
                accountNumber:
                  typeof receiptMovimiento.metadata?.accountNumber === "string"
                    ? receiptMovimiento.metadata.accountNumber
                    : null,
                withdrawalReference:
                  typeof receiptMovimiento.metadata?.withdrawalReference ===
                  "string"
                    ? receiptMovimiento.metadata.withdrawalReference
                    : null,
                ticketReference:
                  typeof receiptMovimiento.metadata?.ticketReference === "string"
                    ? receiptMovimiento.metadata.ticketReference
                    : null,
                destinationAddress:
                  typeof receiptMovimiento.metadata?.destinationAddress ===
                  "string"
                    ? receiptMovimiento.metadata.destinationAddress
                    : null,
                payoutMethod:
                  typeof receiptMovimiento.metadata?.payoutMethod === "string"
                    ? receiptMovimiento.metadata.payoutMethod
                    : null,
                reviewDecision:
                  typeof receiptMovimiento.metadata?.reviewDecision === "string"
                    ? receiptMovimiento.metadata.reviewDecision
                    : null,
                reviewedAt:
                  typeof receiptMovimiento.metadata?.reviewedAt === "string"
                    ? receiptMovimiento.metadata.reviewedAt
                    : null,
                requestedAt: receiptMovimiento.fecha,
                adminNote:
                  typeof receiptMovimiento.metadata?.adminNote === "string"
                    ? receiptMovimiento.metadata.adminNote
                    : null,
              }
            : null
        }
      />
    </div>
  );
}
