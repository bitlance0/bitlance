// src/modules/usuarios/ui/views/usuarios-view.tsx
"use client";

import UsuariosTabs from "../components/usuarios-tabs";
import GeneralTab from "../components/tabs/general-tab";
import { RolesTab } from "../components/tabs/roles-tab";
import { PermisosTab } from "../components/tabs/permisos-tab";

interface UsuariosViewProps {
  activeTab: string;
  usuarioId?: string;
}

export default function UsuariosView({ activeTab, usuarioId }: UsuariosViewProps) {
  const renderTabContent = () => {
    switch (activeTab) {
      case "General":
        return <GeneralTab usuarioId={usuarioId} />;
      case "Roles":
        return <RolesTab usuarioId={usuarioId} />;
      case "Permisos":
        return <PermisosTab usuarioId={usuarioId} />;
      default:
        return <GeneralTab usuarioId={usuarioId} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Título + Tabs arriba */}
      <div className="flex-shrink-0 space-y-2">
        <h1 className="text-xl font-bold text-yellow-400">Gestión de Usuarios</h1>
        <UsuariosTabs activeTab={activeTab} />
      </div>

      {/* Contenido del tab */}
      <div className="flex-1 overflow-y-auto mt-4 rounded-2xl bg-muted p-6">
        {renderTabContent()}
      </div>
    </div>
  );
}