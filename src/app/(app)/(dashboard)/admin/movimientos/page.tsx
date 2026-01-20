"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Movimiento = {
  id: string;
  tipo: string;
  monto: number;
  fecha: string; // ISO
  currency: string;
  status: string;
  userName?: string | null;
  userEmail?: string | null;
  userId?: string | null;
  metadata?: any;
};

type ApiResponse = {
  items: Movimiento[];
  nextOffset: number;
  hasMore: boolean;
};

const PAGE_SIZE = 10;

// -------------------- Helpers fecha --------------------
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

// -------------------- PAGE --------------------
export default function AdminMovimientosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filtros controlados
  const [filtroTipo, setFiltroTipo] = useState<
    "todos" | "depositos" | "retiros" | "ajustes"
  >("todos");

  const [filtroEstado, setFiltroEstado] = useState<
    "todos" | "pending" | "completed" | "failed"
  >("todos");

  const [busquedaUsuario, setBusquedaUsuario] = useState("");

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [filtroMoneda, setFiltroMoneda] = useState<"todas" | "USD" | "COP">(
    "todas"
  );

  const [filtroCuentaId, setFiltroCuentaId] = useState("");

  // accordion
  const [activo, setActivo] = useState<string | null>(null);

  // --------- Helpers de clasificación ---------
  function isAdminAdjustment(m: Movimiento): boolean {
    return m.metadata?.source === "admin_adjustment";
  }

  function isNegative(m: Movimiento): boolean {
    const tipoLower = (m.tipo || "").toLowerCase();
    const dir = (m.metadata?.direction || "").toUpperCase();
    const metaTipo = (m.metadata?.tipo || "").toUpperCase();

    if (tipoLower.includes("retiro")) return true;
    if (tipoLower.includes("cargo")) return true;
    if (dir === "CARGO") return true;
    if (metaTipo === "CARGO") return true;

    return false;
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

  // --------- Fetch Movimientos ---------
  async function loadMovimientos(initial = false) {
    try {
      setError(null);

      if (initial) setLoading(true);
      else setLoadingMore(true);

      const currentOffset = initial ? 0 : offset;

      const params = new URLSearchParams();
      params.set("limit", PAGE_SIZE.toString());
      params.set("offset", currentOffset.toString());

      // filtros → query params
      if (filtroTipo !== "todos") params.set("tipo", filtroTipo);
      if (filtroEstado !== "todos") params.set("estado", filtroEstado);
      if (busquedaUsuario.trim()) params.set("q", busquedaUsuario.trim());
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (filtroMoneda !== "todas") params.set("currency", filtroMoneda);
      if (filtroCuentaId.trim()) params.set("accountId", filtroCuentaId.trim());

      const res = await fetch(`/api/admin/movimientos?${params.toString()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error cargando movimientos");
      }

      const data: ApiResponse = await res.json();

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

  // Primera carga
  useEffect(() => {
    loadMovimientos(true);
  }, []);

  const toggleMovimiento = (id: string) => {
    setActivo((prev) => (prev === id ? null : id));
  };

  // --------- Agrupar por día ---------
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

  // -------- Render inicial cargando --------
  if (loading && movimientos.length === 0) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-bold text-yellow-500">
            Admin Movimientos
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Revisa los últimos movimientos financieros.
          </p>
        </header>
        <div className="flex justify-center items-center py-16">
          <Loader2 className="animate-spin h-6 w-6 text-[var(--color-primary)]" />
        </div>
      </div>
    );
  }

  // -------- Contadores rápidos --------
  const entradasCount = movimientos.filter((m) => !isNegative(m)).length;
  const salidasCount = movimientos.filter((m) => isNegative(m)).length;
  const ajustesCount = movimientos.filter((m) => isAdminAdjustment(m)).length;

  // =====================================================================
  // ============================  RENDER  ===============================
  // =====================================================================

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">
            Admin Movimientos
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Últimas transacciones registradas. Los filtros aplican en servidor.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 rounded-full px-3 py-1">
            Entradas: {entradasCount}
          </Badge>
          <Badge className="bg-red-500/10 text-red-300 border-red-500/30 rounded-full px-3 py-1">
            Salidas: {salidasCount}
          </Badge>
          <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/30 rounded-full px-3 py-1">
            Ajustes admin: {ajustesCount}
          </Badge>
        </div>
      </header>

      {/* FILTROS */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            Filtros (DB)
          </span>

          <div className="flex flex-wrap gap-3">
            {/* Tipo */}
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
                <option value="depositos">Depósitos</option>
                <option value="retiros">Retiros</option>
                <option value="ajustes">Ajustes admin</option>
              </select>
            </div>

            {/* Estado */}
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

            {/* Moneda */}
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

            {/* Cuenta ID */}
            <div className="flex items-center gap-2 min-w-[150px]">
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

            {/* Desde */}
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

            {/* Hasta */}
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

            {/* Usuario */}
            <div className="flex items-center gap-2 min-w-[180px]">
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

            {/* Botón aplicar */}
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-3"
                disabled={loading}
                onClick={() => {
                  setOffset(0);
                  loadMovimientos(true);
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
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

      {/* LISTA AGRUPADA */}
      <section className="space-y-4">
        {movimientosAgrupados.length === 0 && !loading && !error && (
          <div className="text-sm text-[var(--color-text-muted)] text-center py-10">
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
                <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
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

                const montoAbsoluto = Math.abs(m.monto ?? 0);
                const signChar = negativo ? "-" : "+";

                const meta = m.metadata || {};
                const accountId = meta.accountId as string | undefined;
                const userId =
                  m.userId || meta.userId || null;

                const headerColor = negativo
                  ? ajuste
                    ? "text-purple-300"
                    : "text-red-400"
                  : ajuste
                  ? "text-purple-300"
                  : "text-green-400";

                const Icon = negativo ? ArrowUpCircle : ArrowDownCircle;

                // Etiqueta bonita
                let tipoLabel = m.tipo || "Movimiento";
                if (ajuste) {
                  const mt = (meta.tipo || "").toUpperCase();
                  tipoLabel =
                    mt === "ABONO"
                      ? "Ajuste admin · Abono"
                      : mt === "CARGO"
                      ? "Ajuste admin · Cargo"
                      : "Ajuste administrativo";
                }

                return (
                  <div
                    key={m.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => toggleMovimiento(m.id)}
                      className="w-full p-4 flex justify-between items-center text-left hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`${headerColor} h-5 w-5`} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{tipoLabel}</p>

                            {ajuste && (
                              <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/30 text-[10px]">
                                Ajuste admin
                              </Badge>
                            )}

                            {claseTipo === "deposito" && !ajuste && (
                              <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]">
                                Depósito
                              </Badge>
                            )}

                            {claseTipo === "retiro" && !ajuste && (
                              <Badge className="bg-red-500/10 text-red-300 border-red-500/30 text-[10px]">
                                Retiro
                              </Badge>
                            )}

                            <Badge className="bg-[var(--color-surface)] border-[var(--color-border)] text-[10px] capitalize">
                              {m.status || "desconocido"}
                            </Badge>
                          </div>

                          <span className="text-[11px] text-[var(--color-text-muted)]">
                            {m.userName || "Usuario desconocido"}{" "}
                            {m.userEmail && (
                              <span className="text-[10px]">
                                · {m.userEmail}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-sm ${headerColor}`}>
                          {signChar}
                          {montoAbsoluto.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          {m.currency || "USD"}
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
                          <div className="p-5 text-xs space-y-3">
                            <div className="flex justify-between flex-wrap gap-3">
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

                            {/* METADATA */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {meta.motivo && (
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Motivo:
                                  </span>
                                  <div className="font-medium">
                                    {meta.motivo}
                                  </div>
                                </div>
                              )}

                              {typeof meta.oldBalance === "number" &&
                                typeof meta.newBalance === "number" && (
                                  <div>
                                    <span className="text-[var(--color-text-muted)]">
                                      Balance cuenta:
                                    </span>
                                    <div className="font-medium">
                                      {meta.oldBalance.toLocaleString()} →{" "}
                                      {meta.newBalance.toLocaleString()}
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
                                      {meta.oldUserBalance.toLocaleString()} →{" "}
                                      {meta.newUserBalance.toLocaleString()}
                                    </div>
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

                            {/* LINK-ADMIN */}
                            {accountId && userId && (
                              <div className="flex justify-end pt-2">
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="text-[11px]"
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

      {/* BOTÓN CARGAR MÁS */}
      {hasMore && (
        <div className="flex justify-center py-6">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={() => loadMovimientos(false)}
            className="text-xs px-4"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Cargando...
              </>
            ) : (
              "Cargar 10 más"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
