"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { useUserStore } from "@/stores/useUserStore";
import { Loader2, User, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

/* === COMPONENTES BASE === */
const Card = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg ${className}`}>
    {children}
  </div>
);
const CardHeader = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <div className={`p-4 md:p-6 pb-2 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <h3 className={`text-xl font-semibold text-[var(--color-primary)] flex items-center gap-2 ${className}`}>{children}</h3>
);
const CardContent = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <div className={`p-4 md:p-6 pt-2 ${className}`}>{children}</div>
);

/* === TIPOS === */
interface Usuario {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

/* === COMPONENTE PRINCIPAL === */
export default function DetallesPersonalesTab() {
  const user = useUserStore((state) => state.user); // ✅ Usuario logueado
  const [usuario, setUsuario] = useState<Usuario | null>(user || null);
  const [loading, setLoading] = useState(true);

  const fetchUsuario = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/usuarios/${user.id}`);
      if (!res.ok) throw new Error("No se pudo cargar el usuario");
      const data = await res.json();
      setUsuario(data);
    } catch (error) {
      toast.error("Error al cargar los datos del usuario");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUsuario();
  }, [fetchUsuario]);

  /* === ESTADOS DE CARGA === */
  if (!user)
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
        <User className="h-10 w-10 mb-3 opacity-60" />
        <p>No hay sesión activa. Por favor, inicia sesión.</p>
      </div>
    );

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
        <Loader2 className="animate-spin h-8 w-8 mb-4 text-[var(--color-primary)]" />
        <p>Cargando detalles personales...</p>
      </div>
    );

  if (!usuario)
    return (
      <div className="text-center py-16 text-[var(--color-text-muted)]">
        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No se pudo encontrar la información del usuario.</p>
      </div>
    );

  /* === RENDER PRINCIPAL === */
  return (
    <div className="space-y-6 max-w-3xl mx-auto p-4 md:p-6 text-[var(--color-text)]">
      {/* Información Personal */}
      <Card className="border-l-4 border-l-blue-400">
        <CardHeader>
          <CardTitle className="text-blue-400">
            <User className="h-4 w-4" /> Información Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-[var(--color-text)]">Nombre Completo</h4>
            <p className="text-[var(--color-text-muted)]">{usuario.name || "Sin nombre registrado"}</p>
          </div>

          <div>
            <h4 className="font-semibold text-[var(--color-text)]">Correo Electrónico</h4>
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <Mail className="h-4 w-4 text-amber-400" />
              <span>{usuario.email}</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-[var(--color-text)]">Teléfono</h4>
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <Phone className="h-4 w-4 text-green-400" />
              <span>{usuario.phone || "No registrado"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registro de Tiempos */}
      {(usuario.createdAt || usuario.updatedAt) && (
        <Card className="border-l-4 border-l-emerald-400">
          <CardHeader>
            <CardTitle className="text-emerald-400">
              <Loader2 className="h-4 w-4" /> Registro de Tiempos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Fecha de Registro</p>
                <p className="font-medium">
                  {usuario.createdAt
                    ? new Date(usuario.createdAt).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Última Actualización</p>
                <p className="font-medium">
                  {usuario.updatedAt
                    ? new Date(usuario.updatedAt).toLocaleString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
