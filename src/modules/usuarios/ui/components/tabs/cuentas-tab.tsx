"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

import AccountCard, {
  AccountCardProps,
} from "@/app/(app)/(dashboard)/cuentas/_components/AccountCard";

import AccountAdminDrawer, {
  AdminAccount,
} from "../account/AccountAdminDrawer";

import AddAccountDrawer from "@/app/(app)/(dashboard)/cuentas/_components/AddAccountDrawer";

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

  // Drawer administrativo
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(null);

  // 👉 NUEVO: Solo guardamos el ID
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 1) Fetch lista de cuentas del usuario
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
    fetchCuentas();
  }, [fetchCuentas]);

  // 2) Fetch del DETALLE de cuenta cuando el admin abre el drawer
  useEffect(() => {
    if (!selectedAccountId) return;

    async function loadDetail() {
      setLoadingDetail(true);

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
      } finally {
        setLoadingDetail(false);
      }
    }

    loadDetail();
  }, [selectedAccountId]);

  const totalBaseUSD = useMemo(
    () =>
      cuentas.reduce(
        (acc, c) => acc + c.balance * (FX_SIM[c.moneda] ?? 1),
        0
      ),
    [cuentas]
  );

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-primary)]">
              Cuentas del usuario
            </h2>
            <p className="text-sm text-muted-foreground">
              Crea, administra y controla las cuentas de trading asociadas a este usuario.
            </p>
          </div>

          <AddAccountDrawer
            onCreated={(nueva) => {
              setCuentas((prev) => [nueva as Cuenta, ...prev]);
              toast.success("Cuenta creada para el usuario (simulada)");
            }}
          />
        </div>

        {/* Resumen */}
        <Card className="border-l-4 border-l-yellow-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <CreditCard className="h-5 w-5" />
              Resumen de Cuentas del Usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 text-center border rounded-lg bg-[var(--color-surface-alt)]">
                <div className="text-2xl font-bold text-yellow-400">
                  {cuentas.length}
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">
                  Total Cuentas
                </div>
              </div>

              <div className="p-4 text-center border rounded-lg bg-[var(--color-surface-alt)]">
                <div className="text-2xl font-bold text-green-400">
                  {cuentas.filter((c) => c.estado === "activa").length}
                </div>
                Activas
              </div>

              <div className="p-4 text-center border rounded-lg bg-[var(--color-surface-alt)]">
                <div className="text-2xl font-bold text-blue-400">
                  {cuentas.filter((c) => c.tipo === "trading").length}
                </div>
                Trading
              </div>

              <div className="p-4 text-center border rounded-lg bg-[var(--color-surface-alt)]">
                <div className="text-2xl font-bold text-purple-400">
                  ${totalBaseUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                Balance Total ≈ USD (simulado)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de cuentas */}
        <Card className="border-l-4 border-l-yellow-400">
          <CardHeader>
            <CardTitle className="text-yellow-400">Cuentas asociadas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando cuentas...
              </div>
            ) : cuentas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Este usuario aún no tiene cuentas.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    onView={() => toast.info("Detalle de cuenta — próximamente")}
                    onOperate={() => toast.info("Ir a Plataforma Trading — próximamente")}
                    onSelectActive={() => toast.success("Cuenta marcada como activa (simulado)")}

                    // 💛 Disparador del Drawer real
                    onStatus={() => {
                      setSelectedAccountId(c.id);   // 👈 ahora ID real
                      setDrawerOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drawer administrativo */}
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

    </>
  );
}
