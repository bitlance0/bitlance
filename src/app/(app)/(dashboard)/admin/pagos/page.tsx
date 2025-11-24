// src/(app)/(dashboard)/admin/pagos/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type FormState = {
  amount: string;        // monto normal (ej: 150.50)
  currency: string;      // ej: "usd" o "cop"
  referenceId: string;   // tu referencia interna
  description: string;   // concepto del pago
  customerEmail: string; // correo del cliente (opcional)
};

type UsuarioResumen = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  estado: string;
  fechaRegistro: string;
  ultimoAcceso: string;
  kycVerificado: boolean;
};

type TradingAccount = {
  id: string;
  accountNumber: string;
  name: string;
  currency: string;
  balance: string;
  status: string;
  isDefault?: boolean;
};

export default function CrearPagoPage() {
  const [form, setForm] = useState<FormState>({
    amount: "",
    currency: "usd",
    referenceId: "",
    description: "",
    customerEmail: "",
  });

  const [usuarios, setUsuarios] = useState<UsuarioResumen[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [usersLoading, setUsersLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  /* ============ Cargar usuarios para el admin ============ */
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsersLoading(true);
        const res = await fetch("/api/usuarios");
        const data = await res.json();

        if (!res.ok) {
          console.error("Error cargando usuarios:", data);
          setError(data.error || "No se pudieron cargar los usuarios.");
          return;
        }

        setUsuarios(data);
        if (data.length > 0) {
          setSelectedUserId(data[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Error inesperado cargando los usuarios.");
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, []);

  /* ============ Cargar cuentas de trading cuando cambie de usuario ============ */
  useEffect(() => {
    if (!selectedUserId) {
      setAccounts([]);
      setSelectedAccountId("");
      return;
    }

    const loadAccounts = async () => {
      try {
        setAccountsLoading(true);
        setAccounts([]);
        setSelectedAccountId("");
        const res = await fetch(`/api/trading-accounts?userId=${selectedUserId}`);
        const data = await res.json();

        if (!res.ok) {
          console.error("Error cargando cuentas:", data);
          setError(data.error || "No se pudieron cargar las cuentas de trading.");
          return;
        }

        setAccounts(data);
        if (data.length > 0) {
          const defaultAcc =
            data.find((a: TradingAccount) => a.isDefault) ?? data[0];
          setSelectedAccountId(defaultAcc.id);
          setForm((prev) => ({ ...prev, ['customerEmail']: usuarios.find((u) => u.id === selectedUserId)?.email || "" }));
        }
      } catch (err) {
        console.error(err);
        setError("Error inesperado cargando las cuentas de trading.");
      } finally {
        setAccountsLoading(false);
      }
    };

    loadAccounts();
  }, [selectedUserId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ============ Crear link de pago ============ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPaymentLink(null);

    if (!selectedUserId) {
      setError("Selecciona un usuario.");
      return;
    }

    if (!selectedAccountId) {
      setError("Selecciona una cuenta de trading para acreditar el pago.");
      return;
    }

    // Validar monto
    const parsedAmount = parseFloat(form.amount.replace(",", "."));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Ingresa un monto válido mayor a 0.");
      return;
    }

    if (!form.referenceId.trim()) {
      setError("Ingresa una referencia para identificar el pago.");
      return;
    }

    try {
      setLoading(true);

      // Stripe espera el monto en centavos
      const amountInCents = Math.round(parsedAmount * 100);

      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInCents,
          currency: form.currency.toLowerCase(),
          referenceId: form.referenceId.trim(),
          description:
            form.description || `Pago referencia ${form.referenceId}`,
          customerEmail: form.customerEmail || undefined,
          accountId: selectedAccountId,  // 👈 cuenta de trading destino
          userId: selectedUserId,        // 👈 usuario dueño de la cuenta
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        console.error("Error creando checkout:", data);
        setError(data.error || "No se pudo crear el link de pago.");
        toast.error(data.error || "No se pudo crear el link de pago.");
        return;
      }

      // Guardamos el link para compartirlo
      setPaymentLink(data.url);
      toast.success("Link de pago creado exitosamente.");
    } catch (err) {
      console.error(err);
      setError("Error inesperado al crear el link de pago.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!paymentLink) return;
    try {
      await navigator.clipboard.writeText(paymentLink);
      toast.success("Link copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el link automáticamente.");
    }
  };

  const handleChangeClient = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    setSelectedUserId(userId);
    const user = usuarios.find((u) => u.id === userId);
    setForm((prev) => ({ ...prev, ['customerEmail']: user ? user.email : "" }));
  };

  return (
    <div className="space-y-4">
      {/* Botón para ir a la lista */}
      <Link href="/admin/pagos/lista" className="inline-block">
        <Button className="mb-4 bg-yellow-400 hover:bg-yellow-300 text-black cursor-pointer">
          Lista de pagos
        </Button>
      </Link>

      <div className="flex justify-center items-start text-neutral-100">
        <div className="w-full max-w-2xl p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg">
          <h1 className="text-2xl font-semibold mb-2">Crear link de pago</h1>
          <p className="text-sm text-neutral-400 mb-6">
            Elige el usuario, la cuenta destino y los datos del pago. El saldo
            se acreditará automáticamente cuando Stripe confirme el pago.
          </p>

          {/* Selección de usuario */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Usuario
            </label>
            {usersLoading ? (
              <p className="text-xs text-neutral-400">
                Cargando usuarios...
              </p>
            ) : usuarios.length === 0 ? (
              <p className="text-xs text-red-300">
                No se encontraron usuarios.
              </p>
            ) : (
              <select
                value={selectedUserId}
                onChange={handleChangeClient}
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
              >
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido} — {u.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selección de cuenta de trading */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Cuenta de trading destino
            </label>

            {accountsLoading ? (
              <p className="text-xs text-neutral-400">Cargando cuentas...</p>
            ) : accounts.length === 0 ? (
              <p className="text-xs text-red-300">
                No se encontraron cuentas de trading para este usuario.
              </p>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} — {acc.name} — {acc.balance}{" "}
                    {acc.currency}
                  </option>
                ))}
              </select>
            )}

            <p className="text-xs text-neutral-500 mt-1">
              El depósito se acreditará a esta cuenta cuando Stripe confirme el pago.
            </p>
          </div>

          {/* Formulario de datos del pago */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Monto */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Monto
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="Ej: 150.00"
                  className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <select
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="usd">USD</option>
                  {/* agrega más monedas si las usas */}
                </select>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Ingresa el monto normal (no en centavos).
              </p>
            </div>

            {/* Referencia */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Referencia interna
              </label>
              <input
                type="text"
                name="referenceId"
                value={form.referenceId}
                onChange={handleChange}
                placeholder="Ej: ORD-2025-0001"
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Esta referencia se guardará en Stripe y en tu sistema para rastrear el pago.
              </p>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Descripción del pago
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Ej: Recarga de saldo para trading"
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[70px]"
              />
            </div>

            {/* Email del cliente */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Correo del cliente (opcional)
              </label>
              <input
                type="email"
                name="customerEmail"
                value={form.customerEmail}
                onChange={handleChange}
                placeholder="cliente@correo.com"
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-400 bg-red-950/40 border border-red-700 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={
                loading ||
                usersLoading ||
                accountsLoading ||
                usuarios.length === 0 ||
                accounts.length === 0
              }
              className="w-full py-2.5 rounded-lg bg-yellow-400 text-black font-semibold hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Creando link..." : "Generar link de pago"}
            </button>
          </form>

          {/* Resultado: link generado */}
          {paymentLink && (
            <div className="mt-6 p-4 rounded-xl bg-neutral-800 border border-neutral-700">
              <h2 className="text-sm font-semibold mb-2">Link generado</h2>
              <p className="text-xs text-neutral-400 mb-2">
                Comparte este enlace con tu cliente. Al abrirlo, verá el Checkout de Stripe para realizar el pago.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={paymentLink}
                  className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-lg bg-neutral-700 text-xs font-medium hover:bg-neutral-600"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
