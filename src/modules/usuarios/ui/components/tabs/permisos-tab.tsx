// src/modules/usuarios/ui/components/tabs/PermisosTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Shield, Lock } from "lucide-react";
import { useUserStore } from "@/stores/useUserStore";

/* ---- Componentes de diálogo ---- */
const AlertDialog = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative bg-[var(--color-surface)] rounded-lg shadow-lg max-w-md w-full mx-4 border border-[var(--color-border)]">
        {children}
      </div>
    </div>
  );
};
const AlertDialogContent = ({ children }: any) => <div className="p-6">{children}</div>;
const AlertDialogHeader = ({ children }: any) => <div className="mb-4">{children}</div>;
const AlertDialogTitle = ({ children }: any) => (
  <h2 className="text-lg font-semibold text-[var(--color-primary)]">{children}</h2>
);
const AlertDialogDescription = ({ children }: any) => (
  <p className="text-sm text-[var(--color-text-muted)] mt-2">{children}</p>
);
const AlertDialogFooter = ({ children }: any) => (
  <div className="flex justify-end gap-3 mt-6">{children}</div>
);
const AlertDialogAction = ({ children, onClick }: any) => (
  <button
    onClick={onClick}
    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-light)]"
  >
    {children}
  </button>
);
const AlertDialogCancel = ({ children, onClick }: any) => (
  <button
    onClick={onClick}
    className="px-4 py-2 border border-[var(--color-border)] rounded-md hover:bg-[var(--color-surface-alt)]"
  >
    {children}
  </button>
);

/* ---- UI básicos ---- */
const Card = ({ children, className = "" }: any) => (
  <div className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg ${className}`}>{children}</div>
);
const CardHeader = ({ children }: any) => <div className="p-4 md:p-6 pb-2">{children}</div>;
const CardTitle = ({ children, className = "" }: any) => (
  <h3 className={`text-lg sm:text-xl font-semibold text-[var(--color-primary)] flex items-center gap-2 ${className}`}>{children}</h3>
);
const CardContent = ({ children, className = "" }: any) => <div className={`p-4 md:p-6 pt-2 ${className}`}>{children}</div>;
const Button = ({ children, onClick, variant = "default", disabled = false }: any) => {
  const base = "px-4 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const styles: Record<string, string> = {
    default: "bg-[var(--color-primary)] text-[var(--color-bg)] hover:bg-[var(--color-primary-light)]",
    outline: "border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
    destructive: "bg-[var(--color-danger)] hover:bg-red-600 text-white",
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>{children}</button>;
};
const Input = (p: any) => (
  <input
    {...p}
    className="w-full h-11 px-3 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)]"
  />
);
const Checkbox = ({ checked, disabled, onChange }: any) => (
  <input
    type="checkbox"
    checked={checked}
    disabled={disabled}
    onChange={(e) => onChange(e.target.checked)}
    className={`w-5 h-5 accent-[var(--color-primary)] cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  />
);
const Badge = ({ children, className = "" }: any) => (
  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-[var(--color-border)] ${className}`}>{children}</span>
);

/* ---- Tipos ---- */
type RoleId = "user" | "collaborator" | "admin" | "super";
type PermRow = { id: string; name: string; description?: string; category: "trading" | "analysis" | "support" | "admin" | "admin2" | "payments" };
type RoleMatrix = Record<string, "mandatory" | "optional" | "blocked">;

/* Ranking para detectar degradaciones */
const RANK: Record<RoleId, number> = { user: 1, collaborator: 2, admin: 3, super: 4 };

interface Props { usuarioId?: string }

export function PermisosTab({ usuarioId }: Props) {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<{ id: RoleId; name: string }[]>([]);
  const [catalog, setCatalog] = useState<PermRow[]>([]);
  const [userRole, setUserRole] = useState<RoleId>("user");

  // ── Ahora el rol e id del actor vienen del STORE ──────────────────────────────
  const actorRole = useUserStore((s) => s.role);
  const actorId = useUserStore((s) => s.user?.id || "");

  const [effective, setEffective] = useState<Record<string, boolean>>({});
  const [matrixForSelectedRole, setMatrixForSelectedRole] = useState<RoleMatrix>({});
  const [search, setSearch] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleId>("user");

  // Estado para controlar el diálogo de confirmación
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSave, setPendingSave] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [rRes, pRes, urRes, effRes] = await Promise.all([
          fetch("/api/roles", { credentials: "include", cache: "no-store" }),
          fetch("/api/permissions", { credentials: "include", cache: "no-store" }),
          fetch(`/api/users/${usuarioId}/roles`, { credentials: "include", cache: "no-store" }),
          fetch(`/api/users/${usuarioId}/permissions`, { credentials: "include", cache: "no-store" }),
        ]);
        const rolesJson = await rRes.json();
        const permsJson = await pRes.json();
        const urJson = await urRes.json();
        const effJson = await effRes.json();

        setRoles(rolesJson);
        setCatalog(permsJson);
        setUserRole(urJson.roleId);
        setSelectedRole(urJson.roleId);
        setEffective(effJson.permissions);

        const mRes = await fetch(`/api/roles/${urJson.roleId}/permissions`, { credentials: "include", cache: "no-store" });
        setMatrixForSelectedRole(await mRes.json());
      } catch {
        toast.error("No se pudieron cargar los permisos.");
      } finally {
        setLoading(false);
      }
    })();
  }, [usuarioId]);

  const changeRole = async (role: RoleId) => {
    setSelectedRole(role);
    setHasChanges(true);
    const res = await fetch(`/api/roles/${role}/permissions`, { credentials: "include", cache: "no-store" });
    const base: RoleMatrix = await res.json();
    const proposal: Record<string, boolean> = {};
    for (const p of catalog) {
      const t = base[p.id];
      proposal[p.id] = t === "mandatory" ? true : t === "blocked" ? false : effective[p.id] ?? false;
    }
    setMatrixForSelectedRole(base);
    setEffective(proposal);
  };

  const toggle = (permId: string) => {
    const type = matrixForSelectedRole[permId];
    if (type === "mandatory" || type === "blocked") return;
    // regla especial pasarela
    if (permId === "payments_gateway" && actorRole !== "super") return;
    setEffective(prev => ({ ...prev, [permId]: !prev[permId] }));
    setHasChanges(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? catalog.filter(p => (p.name + (p.description || "")).toLowerCase().includes(q)) : catalog;
  }, [catalog, search]);

  const byCat = useMemo(() => {
    const cats = ["trading", "analysis", "support", "admin", "admin2", "payments"] as const;
    return cats.map(c => ({ cat: c, items: filtered.filter(p => p.category === c) }));
  }, [filtered]);

  const save = async () => {
    setSaving(true);
    try {
      // bloqueo: solo SUPER puede asignar 'super'
      if (selectedRole === "super" && actorRole !== "super") {
        toast.error("Solo un SUPER puede asignar el rol 'Super'.");
        setSaving(false);
        return;
      }

      // confirmación si el actor se está degradando a sí mismo
      const actorSeEdita = usuarioId === actorId;
      const esDegradacion = RANK[selectedRole] < RANK[actorRole as RoleId];
      if (actorSeEdita && esDegradacion) {
        setPendingSave(() => async () => { await executeSave(); });
        setShowConfirmDialog(true);
        setSaving(false);
        return;
      }

      await executeSave();
    } catch (e: any) {
      toast.error(e.message || "No se pudieron guardar los cambios");
      setSaving(false);
    }
  };

  const executeSave = async () => {
    try {
      if (selectedRole !== userRole) {
        const r = await fetch(`/api/users/${usuarioId}/roles`, {
          method: "PUT",
          credentials: "include",
          body: JSON.stringify({ roleId: selectedRole }),
        });
        if (!r.ok) {
          let msg = "Error al guardar rol";
          try {
            const j = await r.json();
            if (j?.error) msg = `${msg}: ${j.error}${j.detail ? ` – ${JSON.stringify(j.detail)}` : ""}`;
          } catch {}
          throw new Error(msg);
        }
      }

      const res = await fetch(`/api/users/${usuarioId}/permissions/sync`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ roleId: selectedRole, state: effective }),
      });
      if (!res.ok) {
        let msg = "Error al sincronizar permisos";
        try {
          const j = await res.json();
          if (j?.error) msg = `${msg}: ${j.error}${j.detail ? ` – ${JSON.stringify(j.detail)}` : ""}`;
        } catch {}
        throw new Error(msg);
      }

      setUserRole(selectedRole);
      setHasChanges(false);
      toast.success("Permisos guardados correctamente");
    } catch (e: any) {
      toast.error(e.message || "No se pudieron guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSave = async () => {
    setShowConfirmDialog(false);
    if (pendingSave) {
      setSaving(true);
      await pendingSave();
      setPendingSave(null);
    }
  };
  const handleCancelSave = () => {
    setShowConfirmDialog(false);
    setPendingSave(null);
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
        <Loader2 className="animate-spin h-8 w-8 mb-4 text-[var(--color-primary)]" />
        <p>Cargando permisos…</p>
      </div>
    );

  return (
    <div className="space-y-6 w-full max-w-[700px] mx-auto px-3 sm:px-5 md:px-6">
      {/* Rol */}
      <Card className="border-l-4 border-l-yellow-400">
        <CardHeader>
          <CardTitle className="text-yellow-400">
            <Shield className="h-5 w-5" /> Rol asignado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            Rol actual: <b className="capitalize">{userRole}</b> — En edición: <b className="capitalize">{selectedRole}</b> — Tu rol: <b className="capitalize">{actorRole}</b>
          </p>

          {/* aviso visible si el actor se está degradando a sí mismo */}
          {usuarioId === actorId && RANK[selectedRole] < RANK[(actorRole as RoleId)] && (
            <div className="rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 px-3 py-2 text-sm">
              <span className="font-semibold text-[var(--color-danger)]">Advertencia:</span>{" "}
              Estás seleccionando un <b>rol inferior</b> para ti mismo. Al guardar, <b>perderás permisos de nivel superior</b>
              (asignar/modificar permisos, configuración del sistema, ver logs y Pasarela de Pagos si aplica).
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {roles.map(r => {
              const isSuperRole = r.id === "super";
              const disabled = isSuperRole && actorRole !== "super"; // bloqueo visual
              return (
                <Button
                  key={r.id}
                  variant={r.id === selectedRole ? "default" : "outline"}
                  onClick={() => !disabled && changeRole(r.id)}
                  disabled={disabled}
                >
                  {r.name}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Permisos */}
      <Card className="border-l-4 border-l-blue-400">
        <CardHeader>
          <CardTitle className="text-blue-400 flex items-center gap-2">
            <Lock className="h-5 w-5" /> Permisos
          </CardTitle>
          <div className="mt-3">
            <Input placeholder="Buscar permisos…" value={search} onChange={(e: any) => setSearch(e.target.value)} />
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {byCat.map(({ cat, items }) =>
            items.length ? (
              <div key={cat} className="border rounded-xl bg-[var(--color-surface-alt)]">
                <div className="p-3 border-b bg-[var(--color-surface)] font-semibold text-[var(--color-primary)] capitalize">
                  {cat}
                </div>
                <div className="p-4 space-y-3">
                  {items.map(p => {
                    const type = matrixForSelectedRole[p.id] ?? "optional";
                    const locked = type !== "optional" || (p.id === "payments_gateway" && actorRole !== "super");
                    const checked = !!effective[p.id];
                    return (
                      <div
                        key={p.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-xl transition-colors ${
                          locked ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-surface)]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox checked={checked} disabled={locked} onChange={() => toggle(p.id)} />
                          <div>
                            <div className="font-medium">{p.name}</div>
                            {p.description && (
                              <div className="text-sm text-[var(--color-text-muted)]">{p.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center flex-wrap gap-2 mt-2 sm:mt-0">
                          {type !== "optional" && <Badge className="capitalize">{type}</Badge>}
                          <Badge className="capitalize">{p.category}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null
          )}
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button variant="outline" onClick={() => { setSelectedRole(userRole); changeRole(userRole); setHasChanges(false); }}>
          Restablecer
        </Button>
        <Button onClick={save} disabled={!hasChanges || saving}>
          {saving ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</span> : "Guardar Cambios"}
        </Button>
      </div>

      {/* Diálogo de confirmación */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambio de rol</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de asignarte el rol "{selectedRole}" (inferior a tu rol actual "{actorRole}").
              Perderás permisos de nivel superior (p. ej., asignar/modificar permisos, configuración del sistema, ver logs y Pasarela de Pagos si aplica).
              ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSave}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
