// src/modules/usuarios/ui/components/tabs/general-tab.tsx
"use client";

import { useEffect, useState, useCallback, ChangeEvent, ReactNode } from "react";
import { toast } from "sonner";
import { Loader2, Shield, Clock, User, Phone } from "lucide-react";

/* === COMPONENTES BASE (Manteniendo tu estructura pero con esquema visual optimizado) === */
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
const Button = ({
  children,
  onClick,
  disabled,
  variant = "default",
  className = "",
}: {
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "destructive";
  className?: string;
}) => {
  const base = "px-4 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const styles: Record<string, string> = {
    default: "bg-[var(--color-primary)] text-[var(--color-bg)] hover:bg-[var(--color-primary-light)]",
    outline: "border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
    destructive: "bg-[var(--color-danger)] hover:bg-red-600 text-white",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};
const Badge = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${className}`}>
    {children}
  </span>
);
const Label = ({ children, htmlFor, className = "" }: { children?: ReactNode; htmlFor?: string; className?: string }) => (
  <label htmlFor={htmlFor} className={`text-sm font-medium ${className}`}>
    {children}
  </label>
);
const Switch = ({ id, checked, onCheckedChange }: { id?: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) => (
  <button
    id={id}
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
      checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
    }`}
  >
    <span
      className={`block w-5 h-5 bg-[var(--color-bg)] rounded-full transition-transform duration-200 ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);
type InputProps = {
  type?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
};
const Input = ({ type = "text", placeholder, value, onChange }: InputProps) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className="w-full p-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-alt)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)]"
  />
);

/* === TIPOS === */
interface Usuario {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive" | "banned";
  preferences: {
    phone?: string;
    kycVerified?: boolean;
    twoFactorEnabled?: boolean;
    experience?: string;
  };
  createdAt: string;
  updatedAt: string;
}
interface GeneralTabProps {
  usuarioId?: string;
}

/* === FUNCIONES AUXILIARES === */
const getStatusClasses = (status: Usuario["status"]) => {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-400/30";
    case "inactive":
      return "bg-gray-500/15 text-gray-400 border-gray-400/30";
    case "banned":
      return "bg-red-500/15 text-red-400 border-red-400/30";
    default:
      return "bg-gray-500/15 text-gray-400 border-gray-400/30";
  }
};

/* === COMPONENTE PRINCIPAL === */
export default function GeneralTab({ usuarioId }: GeneralTabProps) {
  const [initialUsuario, setInitialUsuario] = useState<Usuario | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  const fetchData = useCallback(async () => {
    if (!usuarioId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/usuarios/${usuarioId}`);
      if (!res.ok) throw new Error("Error al cargar usuario");
      const data = await res.json();
      setUsuario(data);
      setInitialUsuario(data);
    } catch {
      toast.error("No se pudo cargar el usuario");
    } finally {
      setLoading(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasChanges = () => usuario && initialUsuario && JSON.stringify(usuario) !== JSON.stringify(initialUsuario);

  const handleSave = async () => {
    if (!usuarioId || !usuario || !hasChanges()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/usuarios/${usuarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usuario),
      });
      if (!res.ok) throw new Error();
      setInitialUsuario(usuario);
      toast.success("Cambios guardados correctamente");
    } catch {
      toast.error("No se pudieron guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) setShowCancelConfirmation(true);
    else toast.info("No hay cambios pendientes.");
  };
  const confirmCancel = () => {
    setShowCancelConfirmation(false);
    setUsuario(initialUsuario);
    toast.info("Cambios descartados.");
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
        <Loader2 className="animate-spin h-8 w-8 mb-4 text-[var(--color-primary)]" />
        <p>Cargando datos del usuario...</p>
      </div>
    );

  if (!usuario)
    return (
      <div className="text-center py-16 text-[var(--color-text-muted)]">
        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Usuario no encontrado.</p>
      </div>
    );

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 text-[var(--color-text)]">
      {/* Modal de confirmación */}
      {showCancelConfirmation && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
          <Card className="max-w-md w-full p-6 space-y-4 border border-[var(--color-danger)]/50">
            <h3 className="text-xl font-semibold text-[var(--color-danger)]">Descartar Cambios Pendientes</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              ¿Deseas descartar todos los cambios realizados? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCancelConfirmation(false)}>
                Mantener Edición
              </Button>
              <Button onClick={confirmCancel} variant="destructive">
                Descartar Todo
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Perfil */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">{usuario.name}</h1>
            <p className="text-[var(--color-text-muted)] mt-1">{usuario.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={getStatusClasses(usuario.status)}>
              {usuario.status === "active" ? "Activo" : usuario.status === "inactive" ? "Inactivo" : "Suspendido"}
            </Badge>
            <Badge
              className={
                usuario.preferences?.kycVerified
                  ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                  : "bg-amber-500/15 text-amber-400 border-amber-500/30"
              }
            >
              {usuario.preferences?.kycVerified ? "KYC Verificado" : "KYC Pendiente"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Configuración */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 📞 Contacto */}
        <Card className="border-l-4 border-l-amber-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-400">
              <Phone className="h-4 w-4" /> Detalles de Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Número de Teléfono</Label>
              <Input
                type="tel"
                value={usuario.preferences?.phone || ""}
                onChange={(e) =>
                  setUsuario({
                    ...usuario,
                    preferences: { ...usuario.preferences, phone: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <Label>Nivel de Experiencia</Label>
              <Input
                type="text"
                value={usuario.preferences?.experience || ""}
                onChange={(e) =>
                  setUsuario({
                    ...usuario,
                    preferences: { ...usuario.preferences, experience: e.target.value },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* 🛡️ Seguridad */}
        <Card className="border-l-4 border-l-blue-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-400">
              <Shield className="h-4 w-4" /> Seguridad y Autenticación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-3 border rounded-lg border-[var(--color-border)] bg-[var(--color-surface-alt)]">
              <div>
                <Label htmlFor="twoFactor" className="text-base font-medium">
                  Autenticación 2FA
                </Label>
                <p className="text-xs text-[var(--color-text-muted)]">Protege la cuenta con doble factor.</p>
              </div>
              <Switch
                id="twoFactor"
                checked={usuario.preferences?.twoFactorEnabled ?? false}
                onCheckedChange={(checked) =>
                  setUsuario({
                    ...usuario,
                    preferences: { ...usuario.preferences, twoFactorEnabled: checked },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ⏰ Tiempos */}
      <Card className="border-l-4 border-l-green-400">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-400">
            <Clock className="h-4 w-4" /> Registro de Tiempos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Fecha de Registro</p>
              <p className="font-medium">
                {new Date(usuario.createdAt).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Última Modificación</p>
              <p className="font-medium">
                {new Date(usuario.updatedAt).toLocaleString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Footer de acciones */}
      <div className="sticky bottom-0 left-0 right-0 py-4 bg-[var(--color-surface)]/95 backdrop-blur-md border-t border-[var(--color-border)] flex justify-end gap-3">
        <Button variant="outline" onClick={handleCancel} disabled={saving}>
          Descartar
        </Button>
        <Button onClick={handleSave} disabled={saving || !hasChanges()}>
          {saving ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Guardando
            </>
          ) : (
            "Guardar Cambios"
          )}
        </Button>
      </div>
    </div>
  );
}
