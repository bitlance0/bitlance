// src/modules/usuarios/ui/components/account/AccountAdminDrawer.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Wallet,
  ArrowRightLeft,
  ChevronUp,
  ChevronDown,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AccountState = "activa" | "suspendida" | "cerrada";
type AjusteTipo = "ABONO" | "CARGO";

type AccountHistoryEntry = {
  id: string;
  accountId: string;
  adminId: string | null;
  action: string;
  type: "state_change" | "balance_adjustment" | "other";
  metadata: any;
  createdAt: string | null;
};

function estadoClasses(estado: AccountState) {
  switch (estado) {
    case "activa":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-400/30";
    case "suspendida":
      return "bg-amber-500/15 text-amber-400 border-amber-400/30";
    case "cerrada":
      return "bg-red-500/15 text-red-400 border-red-400/30";
    default:
      return "bg-gray-500/15 text-gray-400 border-gray-400/30";
  }
}

export type AdminAccount = {
  id: string;
  numero: string;
  tipo: "trading" | "inversion" | "ahorro";
  moneda: string;
  balance: number;
  balanceDisponible: number;
  estado: AccountState;
  fechaCreacion: string; // ISO
  badges?: string[];
};

export interface AccountAdminDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AdminAccount | null;
  onEstadoUpdated?: (nuevoEstado: AccountState) => void;
  onBalanceUpdated?: (newBalance: number) => void;
}

export default function AccountAdminDrawer({
  open,
  onOpenChange,
  account,
  onEstadoUpdated,
  onBalanceUpdated,
}: AccountAdminDrawerProps) {
  const [openSection, setOpenSection] = useState<null | string>(null);

  // ======= estado local de la cuenta (estado + saldos) =======
  const [estadoLocal, setEstadoLocal] = useState<AccountState>("activa");
  const [balanceLocal, setBalanceLocal] = useState<number>(0);
  const [disponibleLocal, setDisponibleLocal] = useState<number>(0);

  const [history, setHistory] = useState<AccountHistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = async () => {
    if (!account?.id) return;
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const res = await fetch(
        `/api/admin/cuentas/${account.id}/historial`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar historial");
      }

      setHistory(data.history ?? []);
    } catch (err: any) {
      console.error(err);
      setHistoryError(err.message || "Error al cargar historial");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };


  useEffect(() => {
    if (account) {
      setEstadoLocal(account.estado);
      setBalanceLocal(account.balance);
      setDisponibleLocal(account.balanceDisponible);
    }
  }, [account]);

  useEffect(() => {
    if (openSection === "historial" && history === null && !historyLoading) {
      void loadHistory();
    }
  }, [openSection, history, historyLoading, account?.id]);


  // ======= confirm cambio de estado =======
  const [confirmEstadoOpen, setConfirmEstadoOpen] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<AccountState | null>(null);
  const [changingEstado, setChangingEstado] = useState(false);

  // ======= confirm ajuste de saldo =======
  const [ajusteDialogOpen, setAjusteDialogOpen] = useState(false);
  const [ajusteTipo, setAjusteTipo] = useState<AjusteTipo>("ABONO");
  const [ajusteMonto, setAjusteMonto] = useState<string>("");
  const [ajusteMotivo, setAjusteMotivo] = useState<string>("");
  const [ajusteLoading, setAjusteLoading] = useState(false);

  // Sheet sin cuenta (se mantiene montado para animaciones)
  if (!account) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md bg-[var(--color-surface)] text-[var(--color-text)] border-l border-[var(--color-border)]"
        >
          <SheetHeader>
            <SheetTitle>Sin cuenta seleccionada</SheetTitle>
            <SheetDescription className="text-xs text-[var(--color-text-muted)]">
              Selecciona una cuenta en la lista para ver sus detalles
              administrativos.
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const {
    id,
    numero,
    tipo,
    moneda,
    fechaCreacion,
    badges,
  } = account;

  const labelEstado =
    estadoLocal === "activa"
      ? "Activa"
      : estadoLocal === "suspendida"
      ? "Suspendida"
      : "Cerrada";

  const formatMoney = (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 2 });

  // opciones de cambio de estado: todo menos el actual
  let estadoOpciones: AccountState[] = ["activa", "suspendida", "cerrada"].filter(
    (e) => e !== estadoLocal
  ) as AccountState[];


  // ==== cambio de estado: abrir confirm ====
  function requestEstadoChange(nuevoEstado: AccountState) {
    setPendingEstado(nuevoEstado);
    setConfirmEstadoOpen(true);
  }

  // ==== confirmar cambio de estado ====
  async function handleConfirmEstado() {
    if (!pendingEstado) return;

    try {
      setChangingEstado(true);

      const res = await fetch(`/api/admin/cuentas/${id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: pendingEstado,
          adminId: "PANEL_ADMIN",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "No se pudo actualizar el estado");
        return;
      }

      setEstadoLocal(pendingEstado);
      // recalcular opciones válidas
      estadoOpciones = ["activa", "suspendida", "cerrada"].filter(
        (e) => e !== pendingEstado
      ) as AccountState[];

      onEstadoUpdated?.(pendingEstado);
      toast.success("Estado actualizado con éxito");

      // 🔄 Forzar refresco del historial
      setHistory(null);          
      if (openSection === "historial") {
        void loadHistory();
      }

      setConfirmEstadoOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Error de red al cambiar el estado");
    } finally {
      setChangingEstado(false);
    }
  }


  // ==== abrir modal de ajuste desde los botones "Abonar / Descontar" ====
  function openAjusteDialog(tipo: AjusteTipo) {
    setAjusteTipo(tipo);
    setAjusteMonto("");
    setAjusteMotivo("");
    setAjusteDialogOpen(true);
  }

  // ==== confirmar ajuste de saldo ====
  async function handleConfirmAjuste() {
    const montoNumber = Number(ajusteMonto);
    if (!Number.isFinite(montoNumber) || montoNumber <= 0) {
      toast.error("Ingresa un monto válido mayor a 0.");
      return;
    }

    try {
      setAjusteLoading(true);

      const res = await fetch(`/api/admin/cuentas/${id}/ajuste`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: ajusteTipo,
          monto: montoNumber,
          motivo: ajusteMotivo || null,
          // adminId: "PANEL_ADMIN",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "No se pudo registrar el ajuste");
        return;
      }

      const newBalance = Number(data.newBalance ?? 0);

      setBalanceLocal(newBalance);
      setDisponibleLocal(newBalance); // por ahora igual
      onBalanceUpdated?.(newBalance);

      toast.success("Ajuste de saldo registrado con éxito");
      setAjusteDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Error de red al registrar el ajuste");
    } finally {
      setAjusteLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-[var(--color-surface)] text-[var(--color-text)] border-l border-[var(--color-border)]"
      >
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex flex-col gap-1">
            <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
              Cuenta de trading
            </span>
            <span className="text-lg font-semibold text-yellow-400">
              {numero}
            </span>
          </SheetTitle>
          <SheetDescription className="text-xs text-[var(--color-text-muted)]">
            Panel administrativo de la cuenta. Aquí puedes gestionar el
            estado, ajustes de saldo y configuración administrativa.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Badges / etiquetas */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="bg-blue-500/10 text-blue-300 border-blue-400/40 text-[11px]"
            >
              {tipo === "trading"
                ? "Trading"
                : tipo === "inversion"
                ? "Inversión"
                : "Ahorro"}
            </Badge>

            <Badge
              variant="outline"
              className={
                estadoLocal === "activa"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/40 text-[11px]"
                  : estadoLocal === "suspendida"
                  ? "bg-amber-500/10 text-amber-300 border-amber-400/40 text-[11px]"
                  : "bg-red-500/10 text-red-300 border-red-400/40 text-[11px]"
              }
            >
              {labelEstado}
            </Badge>

            {badges?.map((b) => (
              <Badge
                key={b}
                variant="outline"
                className="bg-purple-500/10 text-purple-300 border-purple-400/40 text-[11px]"
              >
                {b}
              </Badge>
            ))}
          </div>

          {/* Datos base */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Moneda</span>
              <span className="font-medium">{moneda}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Balance</span>
              <span className="font-semibold">
                {moneda === "USD" ? "$" : ""}
                {formatMoney(balanceLocal)} {moneda !== "USD" ? moneda : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">
                Disponible
              </span>
              <span>
                {moneda === "USD" ? "$" : ""}
                {formatMoney(disponibleLocal)}{" "}
                {moneda !== "USD" ? moneda : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Creada</span>
              <span>
                {new Date(fechaCreacion).toLocaleDateString("es-ES")}
              </span>
            </div>
          </div>

          {/* ================= ACCIONES ADMINISTRATIVAS (ACORDEÓN) ================= */}
          <div className="space-y-3 mt-6">
            <h3 className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
              Acciones administrativas
            </h3>

            {/* Estado de la cuenta */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
              <button
                onClick={() =>
                  setOpenSection(openSection === "estado" ? null : "estado")
                }
                className="w-full flex justify-between items-center p-3 hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <Shield className="w-4 h-4 text-yellow-400" />
                  Cambiar estado de la cuenta
                </span>
                {openSection === "estado" ? (
                  <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
                )}
              </button>

              {openSection === "estado" && (
                <div className="p-4 border-t border-[var(--color-border)] text-sm space-y-3">
                  <div className="text-[var(--color-text-muted)] text-xs">
                    Estado actual
                  </div>

                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${estadoClasses(
                      estadoLocal
                    )}`}
                  >
                    {labelEstado}
                  </span>

                  <div className="text-[var(--color-text-muted)] text-xs mt-4">
                    Cambiar a
                  </div>

                  <div className="flex flex-wrap gap-2 mt-1">
                    {estadoOpciones.map((op) => (
                      <button
                        key={op}
                        onClick={() => requestEstadoChange(op)}
                        className={`
                          inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border
                          transition-all hover:scale-[1.03] active:scale-[0.97]
                          ${estadoClasses(op)}
                        `}
                      >
                        {op === "activa"
                          ? "Activar"
                          : op === "suspendida"
                          ? "Suspender"
                          : "Cerrar"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ajustes de saldo */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
              <button
                onClick={() =>
                  setOpenSection(openSection === "ajuste" ? null : "ajuste")
                }
                className="w-full flex justify-between items-center p-3 hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                  Registrar ajuste de saldo
                </span>
                {openSection === "ajuste" ? (
                  <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
                )}
              </button>

              {openSection === "ajuste" && (
                <div className="p-4 border-t border-[var(--color-border)] text-sm space-y-3">
                  <p className="text-[var(--color-text-muted)]">
                    Ajusta manualmente el balance de esta cuenta.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="justify-start"
                      onClick={() => openAjusteDialog("ABONO")}
                    >
                      Abonar saldo
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="justify-start"
                      onClick={() => openAjusteDialog("CARGO")}
                    >
                      Descontar saldo
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Marcar como cuenta principal */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
              <button
                onClick={() =>
                  setOpenSection(
                    openSection === "principal" ? null : "principal"
                  )
                }
                className="w-full flex justify-between items-center p-3 hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <Wallet className="w-4 h-4 text-green-400" />
                  Marcar como cuenta principal
                </span>
                {openSection === "principal" ? (
                  <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
                )}
              </button>

              {openSection === "principal" && (
                <div className="p-4 border-t border-[var(--color-border)] text-sm space-y-3">
                  <p className="text-[var(--color-text-muted)]">
                    Esto permitirá usar esta cuenta como predeterminada del
                    usuario.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="justify-start"
                    onClick={() => toast.info("Funcionalidad próximamente")}
                  >
                    Establecer como principal
                  </Button>
                </div>
              )}
            </div>

            {/* Historial / Auditoría */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
              <button
                onClick={() =>
                  setOpenSection(openSection === "historial" ? null : "historial")
                }
                className="w-full flex justify-between items-center p-3 hover:bg-[var(--color-surface)] transition-colors"
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <Clock3 className="w-4 h-4 text-purple-400" />
                  Historial / Auditoría
                </span>
                {openSection === "historial" ? (
                  <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
                )}
              </button>

              {openSection === "historial" && (
                <div className="p-4 border-t border-[var(--color-border)] text-sm space-y-3">
                  {historyLoading && (
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Cargando historial...
                    </div>
                  )}

                  {historyError && !historyLoading && (
                    <div className="text-xs text-red-400">
                      {historyError}
                    </div>
                  )}

                  {!historyLoading && !historyError && history && history.length === 0 && (
                    <div className="text-xs text-[var(--color-text-muted)]">
                      No hay registros de auditoría para esta cuenta.
                    </div>
                  )}

                  {!historyLoading && !historyError && history && history.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {history.map((item) => {
                        const meta = item.metadata || {};
                        const dateLabel = item.createdAt
                          ? new Date(item.createdAt).toLocaleString("es-ES")
                          : "Sin fecha";

                        let title = "Acción administrativa";
                        let description: string | null = null;

                        if (item.type === "state_change") {
                          title = "Cambio de estado";
                          description = `Estado: ${meta.oldState} → ${meta.newState}`;
                        } else if (item.type === "balance_adjustment") {
                          title = "Ajuste de saldo";
                          const amount = meta.amount ?? 0;
                          const currency = meta.currency ?? "USD";
                          const motive = meta.motivo ?? "";
                          description = `${meta.tipo || ""} ${amount} ${currency}${
                            motive ? ` · ${motive}` : ""
                          }`;
                        } else {
                          title = item.action || "Acción administrativa";
                          description = meta?.description ?? null;
                        }

                        return (
                          <div
                            key={item.id}
                            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-[var(--color-text)]">
                                  {title}
                                </span>
                                {description && (
                                  <span className="text-[11px] text-[var(--color-text-muted)]">
                                    {description}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">
                                {dateLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ===== MODAL CONFIRM ESTADO ===== */}
        <AlertDialog open={confirmEstadoOpen} onOpenChange={setConfirmEstadoOpen}>
          <AlertDialogContent className="bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-yellow-400" />
                Confirmar cambio de estado
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-[var(--color-text-muted)]">
                Esta acción actualizará el estado de la cuenta de forma
                inmediata.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {pendingEstado && (
              <div className="space-y-2 text-xs mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-text-muted)]">
                    Estado actual:
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium border ${estadoClasses(
                      estadoLocal
                    )}`}
                  >
                    {labelEstado}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-text-muted)]">
                    Nuevo estado:
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium border ${estadoClasses(
                      pendingEstado
                    )}`}
                  >
                    {pendingEstado === "activa"
                      ? "Activa"
                      : pendingEstado === "suspendida"
                      ? "Suspendida"
                      : "Cerrada"}
                  </span>
                </div>
              </div>
            )}

            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel
                className="
                  text-xs
                  border border-yellow-400
                  text-yellow-400
                  bg-transparent
                  hover:bg-yellow-400/10
                  hover:text-yellow-300
                  transition-colors
                  cursor-pointer
                "
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="
                  text-xs
                  bg-yellow-400
                  text-black
                  hover:bg-yellow-500
                  hover:text-black
                  disabled:opacity-60
                  disabled:cursor-not-allowed
                  transition-colors
                  cursor-pointer
                "
                onClick={handleConfirmEstado}
                disabled={changingEstado}
              >
                {changingEstado ? "Aplicando..." : "Confirmar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ===== MODAL AJUSTE DE SALDO ===== */}
        <AlertDialog open={ajusteDialogOpen} onOpenChange={setAjusteDialogOpen}>
          <AlertDialogContent className="bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-sm">
                <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                Registrar ajuste de saldo
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-[var(--color-text-muted)]">
                Este ajuste se aplicará inmediatamente sobre el balance de la
                cuenta.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3 mt-2 text-xs">
              {/* Tipo */}
              <div className="space-y-1">
                <Label className="text-[10px] text-[var(--color-text-muted)]">
                  Tipo de ajuste
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={ajusteTipo === "ABONO" ? "default" : "outline"}
                    className={
                      ajusteTipo === "ABONO"
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "text-emerald-400 border-emerald-400/40"
                    }
                    onClick={() => setAjusteTipo("ABONO")}
                  >
                    Abono
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={ajusteTipo === "CARGO" ? "default" : "outline"}
                    className={
                      ajusteTipo === "CARGO"
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "text-red-400 border-red-400/40"
                    }
                    onClick={() => setAjusteTipo("CARGO")}
                  >
                    Cargo
                  </Button>
                </div>
              </div>

              {/* Monto */}
              <div className="space-y-1">
                <Label className="text-[10px] text-[var(--color-text-muted)]">
                  Monto ({moneda})
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={ajusteMonto}
                  onChange={(e) => setAjusteMonto(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Ej. 100.00"
                />
              </div>

              {/* Motivo */}
              <div className="space-y-1">
                <Label className="text-[10px] text-[var(--color-text-muted)]">
                  Motivo (opcional)
                </Label>
                <Input
                  type="text"
                  value={ajusteMotivo}
                  onChange={(e) => setAjusteMotivo(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Ej. Recarga demo, corrección de saldo..."
                />
              </div>
            </div>

            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel
                className="
                  text-xs
                  border border-yellow-400
                  text-yellow-400
                  bg-transparent
                  hover:bg-yellow-400/10
                  hover:text-yellow-300
                  transition-colors
                  cursor-pointer
                "
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="
                  text-xs
                  bg-yellow-400
                  text-black
                  hover:bg-yellow-500
                  hover:text-black
                  disabled:opacity-60
                  disabled:cursor-not-allowed
                  transition-colors
                  cursor-pointer
                "
                onClick={handleConfirmAjuste}
                disabled={ajusteLoading}
              >
                {ajusteLoading ? "Aplicando..." : "Confirmar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
