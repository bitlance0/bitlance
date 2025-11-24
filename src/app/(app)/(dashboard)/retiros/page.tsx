"use client";

import { useState, useEffect } from "react";
import { Banknote, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function RetirosTab() {
  const [monto, setMonto] = useState("");
  const [loading, setLoading] = useState(false);
  const [retiros, setRetiros] = useState<any[]>([]);

  // Simular 3 retiros iniciales
  useEffect(() => {
    setRetiros([
      {
        id: 1,
        simbolo: "USD",
        tipo: "retiro",
        estado: "completado",
        cantidad: 1,
        precio: 300,
        total: 300,
        cuenta: "Banco Santander",
        fecha: "2025-10-28T14:20:00Z",
        profitLoss: -5,
      },
      {
        id: 2,
        simbolo: "USD",
        tipo: "retiro",
        estado: "pendiente",
        cantidad: 1,
        precio: 150,
        total: 150,
        cuenta: "BBVA",
        fecha: "2025-10-22T09:45:00Z",
        profitLoss: 0,
      },
      {
        id: 3,
        simbolo: "USD",
        tipo: "retiro",
        estado: "rechazado",
        cantidad: 1,
        precio: 500,
        total: 500,
        cuenta: "Payoneer",
        fecha: "2025-10-10T17:05:00Z",
        profitLoss: -500,
      },
    ]);
  }, []);

  const solicitarRetiro = () => {
    if (!monto || parseFloat(monto) <= 0)
      return toast.error("Ingresa un monto válido.");
    setLoading(true);
    setTimeout(() => {
      const nuevoRetiro = {
        id: retiros.length + 1,
        simbolo: "USD",
        tipo: "retiro",
        estado: "pendiente",
        cantidad: 1,
        precio: parseFloat(monto),
        total: parseFloat(monto),
        cuenta: "Cuenta Principal",
        fecha: new Date().toISOString(),
        profitLoss: 0,
      };
      setRetiros([nuevoRetiro, ...retiros]);
      toast.success(`Solicitud de retiro de $${monto} enviada`);
      setMonto("");
      setLoading(false);
    }, 1000);
  };

  const getEstadoClasses = (estado: string) => {
    switch (estado) {
      case "completado":
        return "bg-green-500/10 text-green-400 border border-green-500/20";
      case "pendiente":
        return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
      case "rechazado":
        return "bg-red-500/10 text-red-400 border border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border border-gray-500/20";
    }
  };

  const getTipoClasses = (tipo: string) =>
    "bg-blue-500/10 text-blue-400 border border-blue-500/20";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Formulario */}
      <div className="rounded-xl p-4 border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
        <label className="text-sm font-medium">Monto a retirar (USD)</label>
        <input
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="w-full mt-1 p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
        />
      </div>

      <button
        onClick={solicitarRetiro}
        disabled={loading}
        className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-bg)] font-semibold"
      >
        {loading ? (
          <Loader2 className="animate-spin inline h-4 w-4 mr-2" />
        ) : (
          <Banknote className="inline h-4 w-4 mr-2" />
        )}
        Solicitar Retiro
      </button>

      {/* Lista de Retiros */}
      <div className="space-y-4">
        {retiros.map((operacion) => (
          <div
            key={operacion.id}
            className="border rounded-xl p-4 bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-bold text-lg">{operacion.simbolo}</h4>
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
                    <span className="text-[var(--color-text-muted)]">Cantidad:</span>
                    <span className="font-medium ml-2">{operacion.cantidad}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">Monto:</span>
                    <span className="font-medium ml-2">${operacion.precio.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">Total:</span>
                    <span className="font-medium ml-2">${operacion.total.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">Cuenta:</span>
                    <span className="font-medium ml-2">{operacion.cuenta}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {new Date(operacion.fecha).toLocaleString("es-ES")}
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
                        ${operacion.profitLoss >= 0 ? "+" : ""}
                        {operacion.profitLoss.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {retiros.length === 0 && (
          <p className="text-center text-sm text-[var(--color-text-muted)] py-6">
            No hay retiros registrados.
          </p>
        )}
      </div>
    </div>
  );
}
