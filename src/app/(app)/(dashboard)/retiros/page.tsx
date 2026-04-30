"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  Copy,
  Landmark,
  Loader2,
  ReceiptText,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type WithdrawalItem = {
  id: string;
  simbolo: string;
  tipo: string;
  estado: string;
  cantidad: number;
  precio: number;
  total: number;
  cuenta: string;
  accountId: string | null;
  fecha: string;
  withdrawalReference?: string | null;
  destinationAddress?: string | null;
  payoutMethod?: string | null;
  payoutMethodLabel?: string | null;
  ticketReference?: string | null;
  reviewDecision?: string | null;
  reviewedAt?: string | null;
  adminNote?: string | null;
  profitLoss?: number;
};

type TradingAccountOption = {
  id: string;
  accountNumber: string;
  name: string;
  currency: string;
  status: string;
  isDefault: boolean;
  balance: number;
  pendingWithdrawals: number;
  availableBalance: number;
};

const METHOD_ICON = {
  wallet: Wallet,
  bank_transfer: Landmark,
  cash: Banknote,
} as const;

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString("es-ES");
}

export default function RetirosTab() {
  const [monto, setMonto] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [retiros, setRetiros] = useState<WithdrawalItem[]>([]);
  const [accounts, setAccounts] = useState<TradingAccountOption[]>([]);
  const [minWithdrawal, setMinWithdrawal] = useState(10);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  const parseResponse = async (res: Response) => {
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return res.json();
    }

    const text = await res.text();
    return {
      error: text || `HTTP ${res.status}`,
    };
  };

  const fetchData = async () => {
    try {
      setLoadingData(true);

      const res = await fetch("/api/user/withdrawals", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await parseResponse(res);

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar los retiros.");
      }

      const nextAccounts = (data.accounts ?? []) as TradingAccountOption[];
      setAccounts(nextAccounts);
      setRetiros((data.withdrawals ?? []) as WithdrawalItem[]);
      setMinWithdrawal(Number(data.minWithdrawal ?? 10));

      setSelectedAccountId((current) => {
        if (current && nextAccounts.some((account) => account.id === current)) {
          return current;
        }

        return (
          nextAccounts.find((account) => account.isDefault)?.id ??
          nextAccounts[0]?.id ??
          ""
        );
      });
    } catch (error: any) {
      toast.error(error?.message || "Error cargando retiros.");
    } finally {
      setLoadingData(false);
    }
  };

  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) ?? null;

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiada.`);
    } catch {
      toast.error(`No se pudo copiar la ${label.toLowerCase()}.`);
    }
  }

  const solicitarRetiro = async () => {
    const parsedAmount = Number(monto);

    if (!selectedAccountId) {
      toast.error("Selecciona una cuenta para retirar.");
      return;
    }

    if (!monto || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Ingresa un monto valido.");
      return;
    }

    if (selectedAccount && parsedAmount > selectedAccount.availableBalance) {
      toast.error(
        `Saldo insuficiente. Disponible: $${formatMoney(selectedAccount.availableBalance)} ${selectedAccount.currency}.`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          accountId: selectedAccountId,
          amount: parsedAmount,
        }),
      });

      const data = await parseResponse(res);

      if (!res.ok) {
        throw new Error(
          data.detail || data.error || `No se pudo registrar el retiro (${res.status}).`
        );
      }

      toast.success(data.message || `Solicitud de retiro de $${monto} enviada`);
      setMonto("");
      setOpenTicketId(data.withdrawal?.id ?? null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("withdrawals:changed"));
      }
      await fetchData();
    } catch (error: any) {
      toast.error(error?.message || "Error enviando el retiro.");
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 space-y-4">
        <div>
          <label className="text-sm font-medium">Cuenta de trading</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2"
            disabled={loadingData || accounts.length === 0}
          >
            {accounts.length === 0 && (
              <option value="">Sin cuentas disponibles</option>
            )}
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.accountNumber} - {account.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">
            Monto a retirar ({selectedAccount?.currency ?? "USD"})
          </label>
          <input
            type="number"
            min={minWithdrawal}
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
            <span className="block text-[var(--color-text-muted)]">
              Saldo actual
            </span>
            <span className="font-semibold">
              ${formatMoney(selectedAccount?.balance ?? 0)}
            </span>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
            <span className="block text-[var(--color-text-muted)]">
              Retiros pendientes
            </span>
            <span className="font-semibold">
              ${formatMoney(selectedAccount?.pendingWithdrawals ?? 0)}
            </span>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
            <span className="block text-[var(--color-text-muted)]">
              Disponible
            </span>
            <span className="font-semibold">
              ${formatMoney(selectedAccount?.availableBalance ?? 0)}
            </span>
          </div>
        </div>

        <p className="text-xs text-[var(--color-text-muted)]">
          El retiro minimo es de ${minWithdrawal.toLocaleString()} USD. Cada
          solicitud genera una referencia de salida y queda pendiente de
          revision administrativa.
        </p>
      </div>

      <button
        onClick={solicitarRetiro}
        disabled={loading || loadingData || accounts.length === 0}
        className="rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--color-bg)]"
      >
        {loading ? (
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
        ) : (
          <Banknote className="mr-2 inline h-4 w-4" />
        )}
        Solicitar Retiro
      </button>

      <div className="space-y-4">
        {loadingData && (
          <div className="flex items-center justify-center py-8 text-[var(--color-text-muted)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando retiros...
          </div>
        )}

        {!loadingData &&
          retiros.map((operacion) => {
            const MethodIcon =
              METHOD_ICON[
                (operacion.payoutMethod as keyof typeof METHOD_ICON) ?? "wallet"
              ] ?? Wallet;
            const showTicket = openTicketId === operacion.id;

            return (
              <div
                key={operacion.id}
                className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] transition-colors hover:bg-[var(--color-surface)]"
              >
                <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-bold">
                            Solicitud de Retiro
                          </h4>
                          <Badge className="border border-blue-500/20 bg-blue-500/10 text-blue-400">
                            {operacion.simbolo}
                          </Badge>
                          <Badge className={getEstadoClasses(operacion.estado)}>
                            {operacion.estado}
                          </Badge>
                        </div>

                        <p className="text-sm text-[var(--color-text-muted)]">
                          {operacion.cuenta}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenTicketId((current) =>
                            current === operacion.id ? null : operacion.id
                          )
                        }
                        className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-[var(--color-text-muted)] transition-colors hover:text-white"
                        title="Ver ticket"
                      >
                        <ReceiptText className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                        <span className="block text-[var(--color-text-muted)]">
                          Monto
                        </span>
                        <span className="font-semibold">
                          ${formatMoney(operacion.total)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                        <span className="block text-[var(--color-text-muted)]">
                          Metodo
                        </span>
                        <span className="inline-flex items-center gap-2 font-semibold">
                          <MethodIcon className="h-4 w-4 text-[var(--color-primary)]" />
                          {operacion.payoutMethodLabel ?? "Por definir"}
                        </span>
                      </div>
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                        <span className="block text-[var(--color-text-muted)]">
                          Referencia
                        </span>
                        <span className="font-mono text-xs font-semibold">
                          {operacion.withdrawalReference ?? "Pendiente"}
                        </span>
                      </div>
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                        <span className="block text-[var(--color-text-muted)]">
                          Fecha
                        </span>
                        <span className="font-semibold">
                          {formatDate(operacion.fecha)}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                            Direccion de salida
                          </p>
                          <p className="mt-1 font-mono text-sm">
                            {operacion.destinationAddress ?? "Pendiente de generacion"}
                          </p>
                        </div>

                        {operacion.destinationAddress && (
                          <button
                            type="button"
                            onClick={() =>
                              void copyText(
                                operacion.destinationAddress!,
                                "Direccion"
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)] transition-colors hover:text-white"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copiar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {showTicket && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                        <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                          Ticket
                        </p>
                        <p className="mt-1 font-mono text-sm font-semibold">
                          {operacion.ticketReference ?? "No disponible"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                        <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                          Decision admin
                        </p>
                        <p className="mt-1 font-semibold">
                          {operacion.reviewDecision === "approved"
                            ? "Aprobado"
                            : operacion.reviewDecision === "rejected"
                            ? "Rechazado"
                            : "En revision"}
                        </p>
                      </div>

                      {operacion.reviewedAt && (
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                            Revisado
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatDate(operacion.reviewedAt)}
                          </p>
                        </div>
                      )}

                      {operacion.adminNote && (
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 md:col-span-2">
                          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                            Observaciones
                          </p>
                          <p className="mt-1 text-sm">{operacion.adminNote}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        {!loadingData && retiros.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
            No hay retiros registrados.
          </p>
        )}
      </div>
    </div>
  );
}
