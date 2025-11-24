"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";

type PaymentRow = {
  id: number;
  referenceId: string;
  stripeSessionId: string;
  stripeUrl: string;
  amount: number;
  currency: string;
  status: string;
  customerEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function PaymentsListPage() {
  // === Estados ===
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEmail, setFilterEmail] = useState<string>("");
  const [filterRef, setFilterRef] = useState<string>("");

  // Paginación
  const pageSize = 10;
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/payments");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Error cargando pagos");
        }
        setItems(data);
      } catch (err: any) {
        setError(err.message ?? "Error inesperado");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ===============================
  // FILTROS
  // ===============================
  const filteredItems = useMemo(() => {
    return items
      .filter((p) =>
        filterStatus === "all" ? true : p.status === filterStatus
      )
      .filter((p) =>
        filterEmail.trim()
          ? (p.customerEmail ?? "").toLowerCase().includes(filterEmail.toLowerCase())
          : true
      )
      .filter((p) =>
        filterRef.trim()
          ? p.referenceId.toLowerCase().includes(filterRef.toLowerCase())
          : true
      );
  }, [items, filterStatus, filterEmail, filterRef]);

  // ===============================
  // PAGINACIÓN
  // ===============================
  const totalPages = Math.ceil(filteredItems.length / pageSize);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page]);

  // ===============================
  // Helpers UI
  // ===============================
  const formatAmount = (amount: number, currency: string) =>
    `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;

  const statusColor = (status: string) => {
    switch (status) {
      case "paid_and_credited":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
      case "failed":
        return "bg-red-500/15 text-red-300 border-red-500/40";
      case "pending":
      default:
        return "bg-yellow-500/15 text-yellow-300 border-yellow-500/40";
    }
  };

  if (loading) {
    return <div className="p-6 text-neutral-100">Cargando pagos...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-300">
        Error al cargar pagos: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen text-neutral-100 p-6">
      <Link href="/admin/pagos" className="inline-block">
        <Button className="mb-6 bg-yellow-400 hover:bg-yellow-300 text-black cursor-pointer">
          Crear nuevo link de pago
        </Button>
      </Link>

      <h1 className="text-2xl font-semibold mb-4">Links de pago generados</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Filtra, busca y administra todos los pagos recibidos o pendientes.
      </p>

      {/* Filtros */}
      <div className="mb-6 p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Estado */}
          <div>
            <label className="text-sm mb-1 block">Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:ring-2 focus:ring-yellow-400 w-full"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="paid_and_credited">Pagado y acreditado</option>
              <option value="failed">Fallido</option>
            </select>
          </div>

          {/* Buscar email */}
          <div>
            <label className="text-sm mb-1 block">Email del cliente</label>
            <input
              type="text"
              value={filterEmail}
              onChange={(e) => {
                setFilterEmail(e.target.value);
                setPage(1);
              }}
              placeholder="cliente@email.com"
              className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 w-full"
            />
          </div>

          {/* Buscar referencia */}
          <div>
            <label className="text-sm mb-1 block">Referencia</label>
            <input
              type="text"
              value={filterRef}
              onChange={(e) => {
                setFilterRef(e.target.value);
                setPage(1);
              }}
              placeholder="ORD-1234"
              className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 w-full"
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/70 border-b border-neutral-800">
            <tr>
              <th className="px-4 py-3 text-left">Referencia</th>
              <th className="px-4 py-3 text-left">Monto</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Creado</th>
              <th className="px-4 py-3 text-left">Link</th>
            </tr>
          </thead>

          <tbody>
            {paginatedItems.map((p) => (
              <tr
                key={p.id}
                className="border-b border-neutral-800/70 hover:bg-neutral-800/40"
              >
                <td className="px-4 py-3 font-mono text-xs">{p.referenceId}</td>
                <td className="px-4 py-3">{formatAmount(p.amount, p.currency)}</td>
                <td className="px-4 py-3 text-xs">{p.customerEmail || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${statusColor(
                      p.status
                    )}`}
                  >
                    {p.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-400">
                  {new Date(p.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs">
                  <Link
                    href={p.stripeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-lg bg-yellow-400 text-black text-xs font-medium hover:bg-yellow-300"
                  >
                    Abrir
                  </Link>
                  {/* copiar */}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(p.stripeUrl);
                        toast.success("Link copiado al portapapeles");
                      } catch {
                        toast.error("No se pudo copiar el link automáticamente.");
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-yellow-400 text-black text-xs font-medium hover:bg-yellow-300 ml-2 cursor-pointer"
                  >
                    Copiar
                  </button>
                </td>
              </tr>
            ))}

            {paginatedItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  No se encontraron resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      <div className="flex justify-between items-center mt-4 text-sm text-neutral-300">
        <div>
          Página {page} de {totalPages || 1}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => page > 1 && setPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg disabled:opacity-40"
          >
            Anterior
          </button>

          <button
            onClick={() => page < totalPages && setPage(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
