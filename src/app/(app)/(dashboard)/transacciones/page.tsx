"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TransaccionesFinancierasTab() {
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activo, setActivo] = useState<number | null>(null); // ID del movimiento abierto

  useEffect(() => {
    setTimeout(() => {
      setMovimientos([
        { id: 1, tipo: "Depósito", monto: 500, fecha: "2025-10-10" },
        { id: 2, tipo: "Retiro", monto: 200, fecha: "2025-10-15" },
        { id: 3, tipo: "Cargo", monto: -25, fecha: "2025-10-20" },
      ]);
      setLoading(false);
    }, 900);
  }, []);

  const toggleMovimiento = (id: number) => {
    setActivo((prev) => (prev === id ? null : id)); // Cierra si es el mismo, abre si es otro
  };

  if (loading)
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="animate-spin h-6 w-6 text-[var(--color-primary)]" />
      </div>
    );

  return (
    <div className="space-y-3">
      {movimientos.map((m) => {
        const abierto = activo === m.id;
        return (
          <div
            key={m.id}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] overflow-hidden transition-all"
          >
            {/* Encabezado */}
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
                  <span className="text-xs text-[var(--color-text-muted)]">{m.fecha}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`font-bold ${m.monto >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {m.monto >= 0 ? "+" : "-"}${Math.abs(m.monto)}
                </span>
                {abierto ? (
                  <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
                )}
              </div>
            </button>

            {/* Contenido expandido */}
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
                  <div className="p-4 max-w-md mx-auto text-sm text-[var(--color-text-muted)] space-y-2">
                    <p><strong>ID de transacción:</strong> {m.id}</p>
                    <p><strong>Tipo:</strong> {m.tipo}</p>
                    <p><strong>Monto:</strong> {m.monto >= 0 ? "+" : "-"}${Math.abs(m.monto)}</p>
                    <p><strong>Fecha:</strong> {m.fecha}</p>
                    <p><strong>Estado:</strong> {m.monto >= 0 ? "Completado" : "Procesado"}</p>
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
