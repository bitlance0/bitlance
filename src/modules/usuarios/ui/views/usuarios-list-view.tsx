// src/modules/usuarios/ui/views/usuarios-list-view.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Settings } from "lucide-react";

type Usuario = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  estado: "activo" | "inactivo" | "suspendido";
  fechaRegistro: string;
  ultimoAcceso: string;
  kycVerificado: boolean;
};

export default function UsuariosListView() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroRol, setFiltroRol] = useState<string>("todos");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const res = await fetch("/api/usuarios");
        if (!res.ok) throw new Error("Error al obtener usuarios");
        const data = await res.json();
        setUsuarios(data);
      } catch (error) {
        console.error(error);
      } finally {
        setCargando(false);
      }
    };

    fetchUsuarios();
  }, []);

  const usuariosFiltrados = usuarios.filter(usuario => {
    const coincideBusqueda =
      usuario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      usuario.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
      usuario.email.toLowerCase().includes(busqueda.toLowerCase());

    const coincideEstado = filtroEstado === "todos" || usuario.estado === filtroEstado;

    const coincideRol =
      filtroRol === "todos" ||
      (filtroRol === "admin" && (usuario.rol.toLowerCase().includes("admin"))) ||
      (filtroRol === "colaborador" && (usuario.rol.toLowerCase().includes("colaborador") || usuario.rol.toLowerCase().includes("collaborator"))) ||
      (filtroRol === "usuario" && !usuario.rol.toLowerCase().includes("admin") && !usuario.rol.toLowerCase().includes("colaborador"));

    return coincideBusqueda && coincideEstado && coincideRol;
  });

  const navegarAUsuario = (usuarioId: string) => {
    router.push(`/admin/usuarios/${usuarioId}?tab=General`);
  };

  const getBadgeVariant = (estado: string) => {
    switch (estado) {
      case "activo":
        return "default";
      case "inactivo":
        return "secondary";
      case "suspendido":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-8 bg-[var(--color-bg)] text-[var(--color-text)] transition-colors px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground">
            Administra todos los usuarios del sistema de trading
          </p>
        </div>
        <Button className="btn-primary flex items-center gap-2 w-full sm:w-auto">
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Filtros y Búsqueda */}
      <Card className="card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                className="pl-9 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] w-full sm:w-auto"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
              <option value="suspendido">Suspendidos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Usuarios",
            value: usuarios.length,
            color: "text-[var(--color-primary)]",
            border: "border-l-[3px] border-[var(--color-primary)]",
          },
          {
            label: "Activos",
            value: usuarios.filter((u) => u.estado === "activo").length,
            color: "text-green-500",
            border: "border-l-[3px] border-green-500",
          },
          {
            label: "KYC Verificados",
            value: usuarios.filter((u) => u.kycVerificado).length,
            color: "text-blue-400",
            border: "border-l-[3px] border-blue-400",
          },
          {
            label: "Suspendidos",
            value: usuarios.filter((u) => u.estado === "suspendido").length,
            color: "text-red-400",
            border: "border-l-[3px] border-red-400",
          },
        ].map((item, idx) => (
          <Card key={idx} className={`card ${item.border}`}>
            <CardContent className="p-4">
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-sm text-muted-foreground">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista */}
      <Card className="card">
        <CardHeader className="border-b border-[var(--color-border)] pb-2">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <CardTitle className="text-[var(--color-primary)] font-semibold border-l-4 border-[var(--color-primary)] pl-2">
              Lista de Usuarios
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {["usuario", "admin", "colaborador", "todos"].map((rol) => (
                <Button
                  key={rol}
                  size="sm"
                  variant={filtroRol === rol ? "default" : "outline"}
                  onClick={() => setFiltroRol(rol)}
                  className={
                    filtroRol === rol
                      ? "btn-primary"
                      : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  }
                >
                  {rol.charAt(0).toUpperCase() + rol.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="bg-[var(--color-surface)]">
          {cargando ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando usuarios...
            </div>
          ) : usuariosFiltrados.length > 0 ? (
            <div className="space-y-2">
              {usuariosFiltrados.map((usuario) => (
                <div
                  key={usuario.id}
                  onClick={() => navegarAUsuario(usuario.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors gap-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[var(--color-primary)] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-black">
                        {usuario.nombre[0]}
                        {usuario.apellido[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-[var(--color-text)]">
                        {usuario.nombre} {usuario.apellido}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {usuario.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{usuario.rol}</Badge>
                      <Badge variant={getBadgeVariant(usuario.estado)}>
                        {usuario.estado}
                      </Badge>
                      {usuario.kycVerificado && (
                        <Badge className="bg-green-500 text-white">KYC</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navegarAUsuario(usuario.id);
                      }}
                      className="text-muted-foreground hover:text-[var(--color-primary)] p-2"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron usuarios
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}