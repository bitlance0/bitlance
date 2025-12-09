// src/app/(app)/(dashboard)/historial/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

type Operacion = {
  id: string;
  simbolo: string;
  tipo: string;
  estado: string;
  cantidad: number;
  precio: number;
  total: number;
  cuenta: string;
  fecha: string;
  profitLoss?: number;
};

type Movimiento = {
  id: string;
  tipo: string;
  monto: number;
  fecha: string;
  operaciones: Operacion[];
};

export default function TransaccionesFinancierasTab() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [activo, setActivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/user/historial", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al cargar historial");
        }

        if (!cancelled) {
          setMovimientos(data.movimientos ?? []);
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setError(err.message || "Error cargando historial");
          setMovimientos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleMovimiento = (id: string) => {
    setActivo((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="animate-spin h-6 w-6 text-[var(--color-primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!movimientos.length) {
    return (
      <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
        Aún no tienes movimientos registrados en tu historial.
      </div>
    );
  }

  const getTipoClasses = (tipo: string) =>
    tipo === "compra"
      ? "bg-green-500/10 text-green-400 border-green-500/20"
      : tipo === "venta"
      ? "bg-red-500/10 text-red-400 border-red-500/20"
      : "bg-blue-500/10 text-blue-400 border-blue-500/20";

  const getEstadoClasses = (estado: string) => {
    switch (estado) {
      case "completada":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "pendiente":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "procesado":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-3">
      {movimientos.map((m) => {
        const abierto = activo === m.id;
        return (
          <div
            key={m.id}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] overflow-hidden transition-all"
          >
            {/* CABECERA DEL MOVIMIENTO */}
            <button
              onClick={() => toggleMovimiento(m.id)}
              className="w-full p-4 flex justify-between items-center text-left hover:bg-[var(--color-surface)] transition-colors"
            >
              <div className="flex items-center gap-2">
                {m.monto >= 0 ? (
                  <ArrowDownCircle className="text-green-400 h-5 w-5" />
                ) : (
                  <ArrowUpCircle className="text-red-400 h-5 w-5" />
                )}
                <div>
                  <p className="font-semibold">{m.tipo}</p>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {m.fecha}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`font-bold ${
                    m.monto >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {m.monto >= 0 ? "+" : "-"}$
                  {Math.abs(m.monto).toLocaleString()}
                </span>
                {abierto ? (
                  <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
                )}
              </div>
            </button>

            {/* CONTENIDO DETALLADO */}
            <AnimatePresence initial={false}>
              {abierto && (
                <motion.div
                  key="contenido"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="border-t border-[var(--color-border)] bg-[var(--color-surface)]"
                >
                  <div className="p-5 max-w-2xl mx-auto">
                    <h4 className="font-bold text-[var(--color-primary)] mb-4">
                      Detalles del movimiento
                    </h4>
                    <div className="space-y-4">
                      {m.operaciones.map((operacion) => (
                        <div
                          key={operacion.id}
                          className="border rounded-xl p-4 bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface)] transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-bold text-lg">
                                  {operacion.simbolo}
                                </h4>
                                <div className="flex gap-2">
                                  {operacion.tipo && (
                                    <Badge className={getTipoClasses(operacion.tipo)}>
                                      {operacion.tipo.toUpperCase()}
                                    </Badge>
                                  )}
                                  {operacion.estado && (
                                    <Badge className={getEstadoClasses(operacion.estado)}>
                                      {operacion.estado}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Cantidad:
                                  </span>
                                  <span className="font-medium ml-2">
                                    {operacion.cantidad}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Precio:
                                  </span>
                                  <span className="font-medium ml-2">
                                    $
                                    {operacion.precio
                                      ? operacion.precio.toLocaleString()
                                      : "0"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Total:
                                  </span>
                                  <span className="font-medium ml-2">
                                    $
                                    {operacion.total
                                      ? operacion.total.toLocaleString()
                                      : "0"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[var(--color-text-muted)]">
                                    Cuenta:
                                  </span>
                                  <span className="font-medium ml-2">
                                    {operacion.cuenta}
                                  </span>
                                </div>
                              </div>

                              <div className="flex justify-between items-center mt-3">
                                <span className="text-sm text-[var(--color-text-muted)]">
                                  {new Date(
                                    operacion.fecha
                                  ).toLocaleString("es-ES")}
                                </span>
                                {operacion.profitLoss !== undefined && (
                                  <div
                                    className={`flex items-center gap-1 ${
                                      operacion.profitLoss >= 0
                                        ? "text-green-400"
                                        : "text-red-400"
                                    }`}
                                  >
                                    {operacion.profitLoss >= 0 ? (
                                      <TrendingUp className="w-4 h-4" />
                                    ) : (
                                      <TrendingDown className="w-4 h-4" />
                                    )}
                                    <span className="font-medium">
                                      $
                                      {operacion.profitLoss >= 0 ? "+" : ""}
                                      {operacion.profitLoss.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
