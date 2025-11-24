// src/app/(app)/(dashboard)/cuentas/page.tsx
"use client";

import { useEffect, useState, useCallback, ReactNode, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  CreditCard,
  ArrowLeft,
  Eye,
  Download,
  Info,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AddAccountDrawer from "./_components/AddAccountDrawer";
import AccountCard, { AccountCardProps } from "./_components/AccountCard";


/* === COMPONENTES BASE (mantienen estilo y tema) === */
const Card = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg ${className}`}>
    {children}
  </div>
);
const CardHeader = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <div className={`p-4 md:p-6 pb-2 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <h3 className={`text-xl font-semibold text-[var(--color-primary)] flex items-center gap-2 ${className}`}>
    {children}
  </h3>
);
const CardContent = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <div className={`p-4 md:p-6 pt-2 ${className}`}>{children}</div>
);
const Badge = ({ children, className = "", title }: { children?: ReactNode; className?: string; title?: string }) => (
  <span
    title={title}
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${className}`}
  >
    {children}
  </span>
);

/* === TIPOS === */
interface Cuenta {
  id: string;
  numero: string;
  tipo: "trading" | "inversion" | "ahorro";
  moneda: "USD" | "BTC" | "ETH" | string; // puedes dejarla así
  balance: number;
  balanceDisponible: number;
  estado: "activa" | "suspendida" | "cerrada";
  fechaCreacion: string; // ISO
  badges?: string[];     
}

/* === Conversión simulada para Resumen (mejora: Balance Total por divisa base) === */
const FX_SIM: Record<string, number> = {
  USD: 1,
  BTC: 65000, // 1 BTC ≈ 65k USD (simulado)
  ETH: 3000,  // 1 ETH ≈ 3k USD (simulado)
};

export default function MisCuentasView() {
  const router = useRouter();

  /* Estado UI */
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);

  /* Filtros/orden (mejora) */
  const [query, setQuery] = useState("");
  const [fTipo, setFTipo] = useState<"" | Cuenta["tipo"]>("");
  const [fEstado, setFEstado] = useState<"" | Cuenta["estado"]>("");
  const [fMoneda, setFMoneda] = useState<"" | Cuenta["moneda"]>("");
  const [orden, setOrden] = useState<"creada_desc" | "creada_asc" | "balance_desc" | "balance_asc">("creada_desc");

  /* Divisa base para resumen (mejora) */
  const [baseCurrency, setBaseCurrency] = useState<"USD" | "BTC" | "ETH">("USD");

  // ⬇️ Reemplaza COMPLETO el contenido de tu función fetchCuentas por esto

  const fetchCuentas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cuentas", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Error consultando cuentas");

      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Respuesta inválida");

      setCuentas(data as Cuenta[]);
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar las cuentas del usuario.");
      setCuentas([]);
    } finally {
      setLoading(false);
    }
  }, []);



  useEffect(() => {
    fetchCuentas();
  }, [fetchCuentas]);

  /* Helpers de estilo */
  const getTipoClasses = (tipo: string) => {
    switch (tipo) {
      case "trading":
        return "bg-blue-500/15 text-blue-400 border-blue-400/30";
      case "inversion":
        return "bg-green-500/15 text-green-400 border-green-400/30";
      case "ahorro":
        return "bg-purple-500/15 text-purple-400 border-purple-400/30";
      default:
        return "bg-gray-500/15 text-gray-400 border-gray-400/30";
    }
  };
  const getEstadoClasses = (estado: string) => {
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
  };

  /* Filtros + Orden (mejora) */
  const cuentasFiltradas = useMemo(() => {
    let arr = [...cuentas];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      arr = arr.filter(
        (c) =>
          c.numero.toLowerCase().includes(q) ||
          c.moneda.toLowerCase().includes(q) ||
          c.tipo.toLowerCase().includes(q)
      );
    }
    if (fTipo) arr = arr.filter((c) => c.tipo === fTipo);
    if (fEstado) arr = arr.filter((c) => c.estado === fEstado);
    if (fMoneda) arr = arr.filter((c) => c.moneda === fMoneda);

    switch (orden) {
      case "creada_asc":
        arr.sort((a, b) => +new Date(a.fechaCreacion) - +new Date(b.fechaCreacion));
        break;
      case "creada_desc":
        arr.sort((a, b) => +new Date(b.fechaCreacion) - +new Date(a.fechaCreacion));
        break;
      case "balance_asc":
        arr.sort((a, b) => a.balance - b.balance);
        break;
      case "balance_desc":
        arr.sort((a, b) => b.balance - a.balance);
        break;
    }
    return arr;
  }, [cuentas, query, fTipo, fEstado, fMoneda, orden]);

  /* Resumen: Balance total convertido a baseCurrency (simulado) */
  const totalBase = useMemo(() => {
    const toUSD = (c: Cuenta) => (c.balance * (FX_SIM[c.moneda] ?? 1));
    const totalUSD = cuentas.reduce((acc, c) => acc + toUSD(c), 0);
    const invRate = 1 / (FX_SIM[baseCurrency] ?? 1);
    return totalUSD * invRate;
  }, [cuentas, baseCurrency]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 space-y-2">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-xl font-bold text-yellow-400">Mis Cuentas</h1>
              <p className="text-sm text-muted-foreground">Gestión de todas tus cuentas de trading</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto mt-4 rounded-2xl bg-muted p-6 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
            <Loader2 className="animate-spin h-8 w-8 mb-4 text-[var(--color-primary)]" />
            <p>Cargando cuentas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-xl font-bold text-yellow-400">Mis Cuentas</h1>
              <p className="text-sm text-muted-foreground">Gestión de todas tus cuentas de trading</p>
            </div>
          </div>

        </div>
      </div>
      {/* Contenido */}
      <div className="flex-1 overflow-y-auto mt-4 rounded-2xl bg-muted p-6">
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex-shrink-0 mb-1 mr-3">
            <div className="flex items-center justify-end">
              <AddAccountDrawer
                onCreated={(nueva) => {
                  // hace push al estado actual SIN tocar backend
                  setCuentas((prev) => [nueva, ...prev]);
                  // opcional: aquí podrías hacer scroll/resaltar la fila nueva
                }}
              />
            </div>
          </div>
          {/* Resumen General con divisa base (mejora) */}
          <Card className="border-l-4 border-l-yellow-400">
            <CardHeader>
              <CardTitle className="text-yellow-400">
                <CreditCard className="h-5 w-5" />
                Resumen de Cuentas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="p-4 text-center border rounded-lg bg-[var(--color-surface-alt)]">
                  <div className="text-2xl font-bold text-yellow-400">{cuentas.length}</div>
                  <div className="text-sm text-[var(--color-text-muted)]">Total Cuentas</div>
                </div>
                <div className="p-4 text-center border rounded-lg bg-[var(--color-surface-alt)]">
                  <div className="text-2xl font-bold text-green-400">
                    {cuentas.filter((c) => c.estado === "activa").length}
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)]">Activas</div>
                </div>
                <div className="p-4 text-center border rounded-lg bg-[var(--color-surface-alt)]">
                  <div className="text-2xl font-bold text-blue-400">
                    {cuentas.filter((c) => c.tipo === "trading").length}
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)]">Trading</div>
                </div>

                {/* Divisa base */}
                <div className="p-4 border rounded-lg bg-[var(--color-surface-alt)]">
                  <div className="text-xs text-[var(--color-text-muted)] mb-1">Divisa base</div>
                  <div className="flex items-center gap-2">
                    <select
                      value={baseCurrency}
                      onChange={(e) => setBaseCurrency(e.target.value as any)}
                      className="w-full rounded-md border bg-transparent p-2 text-sm"
                    >
                      <option value="USD">USD</option>
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                    </select>
                    <span title="Conversión simulada para fines de UI">
                      <Info className="w-4 h-4 text-[var(--color-text-muted)]" />
                    </span>
                  </div>
                </div>

                <div className="p-4 text-center border rounded-lg bg-[var(--color-surface-alt)]">
                  <div className="text-2xl font-bold text-purple-400">
                    {baseCurrency === "USD" ? "$" : ""}{totalBase.toLocaleString(undefined, { maximumFractionDigits: 2 })} {baseCurrency !== "USD" ? baseCurrency : ""}
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)]">Balance Total ≈</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtros / Orden (mejora) */}
          <Card className="border-l-4 border-l-yellow-400">
            <CardHeader>
              <CardTitle className="text-yellow-400">Filtros y orden</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por número, moneda o tipo…"
                  className="rounded-md border bg-transparent p-2 text-sm"
                />
                <select value={fTipo} onChange={(e) => setFTipo(e.target.value as any)} className="rounded-md border bg-transparent p-2 text-sm">
                  <option value="">Tipo (todos)</option>
                  <option value="trading">Trading</option>
                  <option value="inversion">Inversión</option>
                  <option value="ahorro">Ahorro</option>
                </select>
                <select value={fEstado} onChange={(e) => setFEstado(e.target.value as any)} className="rounded-md border bg-transparent p-2 text-sm">
                  <option value="">Estado (todos)</option>
                  <option value="activa">Activa</option>
                  <option value="suspendida">Suspendida</option>
                  <option value="cerrada">Cerrada</option>
                </select>
                <select value={fMoneda} onChange={(e) => setFMoneda(e.target.value as any)} className="rounded-md border bg-transparent p-2 text-sm">
                  <option value="">Moneda (todas)</option>
                  <option value="USD">USD</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                </select>
                <button
                  onClick={() =>
                    setOrden((prev) =>
                      prev === "creada_desc" ? "creada_asc" : prev === "creada_asc" ? "balance_desc" : prev === "balance_desc" ? "balance_asc" : "creada_desc"
                    )
                  }
                  className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm"
                  title="Alternar orden (creación/balance)"
                >
                  <ChevronsUpDown className="w-4 h-4 mr-2" />
                  {orden.includes("creada") ? `Fecha ${orden.endsWith("desc") ? "↓" : "↑"}` : `Balance ${orden.endsWith("desc") ? "↓" : "↑"}`}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Cuentas */}
          <Card className="border-l-4 border-l-yellow-400">
            <CardHeader>
              <CardTitle className="text-yellow-400">Todas las Cuentas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="-mx-2 flex flex-wrap">
                {cuentasFiltradas.map((c) => (
                  <div
                    key={c.id}
                    className="w-full lg:w-1/2 xlg:w-1/3 px-2 mb-4 flex"
                  >
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
                    />
                  </div>
                ))}

                {cuentasFiltradas.length === 0 && (
                  <div className="w-full text-center text-[var(--color-text-muted)] py-10 border rounded-xl">
                    No hay cuentas que coincidan con los filtros actuales.
                  </div>
                )}
              </div>
            </CardContent>


          </Card>
        </div>
      </div>
    </div>
  );
}
