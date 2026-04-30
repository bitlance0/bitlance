"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

import AddAccountDrawer from "@/app/(app)/(dashboard)/cuentas/_components/AddAccountDrawer";
import AccountCard, {
  AccountCardProps,
} from "@/app/(app)/(dashboard)/cuentas/_components/AccountCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AccountAdminDrawer, {
  AdminAccount,
} from "../account/AccountAdminDrawer";

type Cuenta = AdminAccount;

const FX_SIM: Record<string, number> = {
  USD: 1,
  BTC: 65000,
  ETH: 3000,
};

interface CuentasTabProps {
  usuarioId: string;
}

export default function CuentasTab({ usuarioId }: CuentasTabProps) {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(
    null
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );

  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [withdrawalAccount, setWithdrawalAccount] = useState<Cuenta | null>(
    null
  );
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);

  const fetchCuentas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${usuarioId}/cuentas`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Error al obtener cuentas");

      const data = await res.json();
      setCuentas(data as Cuenta[]);
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar las cuentas del usuario");
      setCuentas([]);
    } finally {
      setLoading(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    void fetchCuentas();
  }, [fetchCuentas]);

  const parseResponse = useCallback(async (res: Response) => {
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return res.json();
    }

    const text = await res.text();
    return {
      error: text || `HTTP ${res.status}`,
    };
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;

    async function loadDetail() {
      try {
        const res = await fetch(`/api/admin/cuentas/${selectedAccountId}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Error cargando cuenta");

        setSelectedAccount(data);
      } catch (error) {
        console.error(error);
        toast.error("No se pudo cargar el detalle de la cuenta");
      }
    }

    void loadDetail();
  }, [selectedAccountId]);

  const totalBaseUSD = useMemo(
    () =>
      cuentas.reduce((acc, c) => acc + c.balance * (FX_SIM[c.moneda] ?? 1), 0),
    [cuentas]
  );

  const openAccountDrawer = useCallback((accountId: string) => {
    setSelectedAccountId(accountId);
    setDrawerOpen(true);
  }, []);

  const openWithdrawalDialog = useCallback((account: Cuenta) => {
    setWithdrawalAccount(account);
    setWithdrawalAmount("");
    setWithdrawalDialogOpen(true);
  }, []);

  const handleScheduleWithdrawal = useCallback(async () => {
    if (!withdrawalAccount) return;

    const parsedAmount = Number(withdrawalAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Ingresa un monto valido.");
      return;
    }

    if (parsedAmount > withdrawalAccount.balanceDisponible) {
      toast.error(
        `Saldo insuficiente. Disponible: ${withdrawalAccount.moneda === "USD" ? "$" : ""}${withdrawalAccount.balanceDisponible.toLocaleString(
          undefined,
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )} ${withdrawalAccount.moneda}.`
      );
      return;
    }

    setWithdrawalLoading(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${usuarioId}/withdrawals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: withdrawalAccount.id,
          amount: parsedAmount,
        }),
      });

      const data = await parseResponse(res);

      if (!res.ok) {
        throw new Error(
          data.detail || data.error || `No se pudo programar el retiro (${res.status}).`
        );
      }

      toast.success(
        data.message ||
          `Solicitud de retiro de ${withdrawalAccount.moneda === "USD" ? "$" : ""}${parsedAmount} enviada`
      );

      setWithdrawalDialogOpen(false);
      setWithdrawalAccount(null);
      setWithdrawalAmount("");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("withdrawals:changed"));
      }

      await fetchCuentas();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "No se pudo programar el retiro.");
    } finally {
      setWithdrawalLoading(false);
    }
  }, [fetchCuentas, parseResponse, usuarioId, withdrawalAccount, withdrawalAmount]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-primary)]">
              Cuentas del usuario
            </h2>
            <p className="text-sm text-muted-foreground">
              Crea, administra y controla las cuentas de trading asociadas a
              este usuario.
            </p>
          </div>

          <AddAccountDrawer
            onCreated={(nueva) => {
              setCuentas((prev) => [nueva as Cuenta, ...prev]);
              toast.success("Cuenta creada para el usuario (simulada)");
            }}
          />
        </div>

        <Card className="border-l-4 border-l-yellow-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <CreditCard className="h-5 w-5" />
              Resumen de Cuentas del Usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-lg border bg-[var(--color-surface-alt)] p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {cuentas.length}
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">
                  Total Cuentas
                </div>
              </div>

              <div className="rounded-lg border bg-[var(--color-surface-alt)] p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {cuentas.filter((c) => c.estado === "activa").length}
                </div>
                Activas
              </div>

              <div className="rounded-lg border bg-[var(--color-surface-alt)] p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {cuentas.filter((c) => c.tipo === "trading").length}
                </div>
                Trading
              </div>

              <div className="rounded-lg border bg-[var(--color-surface-alt)] p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  $
                  {totalBaseUSD.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </div>
                Balance Total ~= USD (simulado)
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-400">
          <CardHeader>
            <CardTitle className="text-yellow-400">
              Cuentas asociadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                Cargando cuentas...
              </div>
            ) : cuentas.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Este usuario aun no tiene cuentas.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cuentas.map((c) => (
                  <AccountCard
                    key={c.id}
                    id={c.id}
                    numero={c.numero}
                    tipo={c.tipo}
                    moneda={c.moneda as AccountCardProps["moneda"]}
                    balance={c.balance}
                    balanceDisponible={c.balanceDisponible}
                    estado={c.estado}
                    fechaCreacion={c.fechaCreacion}
                    badges={c.badges ?? []}
                    viewLabel="Ver detalle"
                    operateLabel="Programar Retiro"
                    onView={() => openAccountDrawer(c.id)}
                    onStatus={() => openAccountDrawer(c.id)}
                    onOperate={() => openWithdrawalDialog(c)}
                    onSelectActive={() =>
                      toast.success("Cuenta marcada como activa (simulado)")
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AccountAdminDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        account={selectedAccount}
        onEstadoUpdated={(nuevoEstado) => {
          if (!selectedAccount) return;
          setCuentas((prev) =>
            prev.map((c) =>
              c.id === selectedAccount.id ? { ...c, estado: nuevoEstado } : c
            )
          );
          setSelectedAccount((prev) =>
            prev ? { ...prev, estado: nuevoEstado } : prev
          );
        }}
        onBalanceUpdated={(newBalance) => {
          if (!selectedAccount) return;
          setCuentas((prev) =>
            prev.map((c) =>
              c.id === selectedAccount.id
                ? { ...c, balance: newBalance, balanceDisponible: newBalance }
                : c
            )
          );
          setSelectedAccount((prev) =>
            prev
              ? { ...prev, balance: newBalance, balanceDisponible: newBalance }
              : prev
          );
        }}
      />

      <AlertDialog
        open={withdrawalDialogOpen}
        onOpenChange={(open) => {
          setWithdrawalDialogOpen(open);
          if (!open) {
            setWithdrawalAccount(null);
            setWithdrawalAmount("");
          }
        }}
      >
        <AlertDialogContent className="border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm text-yellow-400">
              Programar Retiro
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[var(--color-text-muted)]">
              Esta accion crea la misma solicitud de retiro del flujo de cliente
              y la deja visible en el panel de movimientos del admin.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--color-text-muted)]">Cuenta</span>
                <span className="font-medium">
                  {withdrawalAccount?.numero ?? "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--color-text-muted)]">Moneda</span>
                <span className="font-medium">
                  {withdrawalAccount?.moneda ?? "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--color-text-muted)]">
                  Disponible
                </span>
                <span className="font-medium">
                  {withdrawalAccount
                    ? `${withdrawalAccount.moneda === "USD" ? "$" : ""}${withdrawalAccount.balanceDisponible.toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )} ${withdrawalAccount.moneda}`
                    : "-"}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-[var(--color-text-muted)]">
                Monto a retirar
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder="Ej. 100.00"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="cursor-pointer border border-yellow-400 bg-transparent text-xs text-yellow-400 transition-colors hover:bg-yellow-400/10 hover:text-yellow-300">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-yellow-400 text-xs text-black transition-colors hover:bg-yellow-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
              onClick={(e) => {
                e.preventDefault();
                void handleScheduleWithdrawal();
              }}
              disabled={withdrawalLoading || !withdrawalAccount}
            >
              {withdrawalLoading ? "Procesando..." : "Solicitar Retiro"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
