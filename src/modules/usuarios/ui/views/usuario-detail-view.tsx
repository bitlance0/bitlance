// src/modules/usuarios/ui/views/usuario-detail-view.tsx
"use client";

// import { useState, useEffect } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import UsuariosTabs from "../components/usuarios-tabs";
import GeneralTab from "../components/tabs/general-tab";
// import { RolesTab } from "../components/tabs/roles-tab";
import { PermisosTab } from "../components/tabs/permisos-tab";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface UsuarioDetailViewProps {
  usuarioId: string;
  activeTab: string;
}

export default function UsuarioDetailView({ usuarioId, activeTab }: UsuarioDetailViewProps) {
  const router = useRouter();
  // const [usuario] = useState(null);

  // En una app real, aquí harías fetch del usuario por ID
  useEffect(() => {
    // Simular carga de datos del usuario
  }, [usuarioId]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "General":
        return <GeneralTab usuarioId={usuarioId} />;
      // case "Roles":
      //   return <RolesTab usuarioId={usuarioId} />;
      case "Permisos":
        return <PermisosTab usuarioId={usuarioId} />;
      default:
        return <GeneralTab usuarioId={usuarioId} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header con navegación */}
      <div className="flex-shrink-0 space-y-2">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/admin/usuarios')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a la lista
          </Button>
          <div>
            <h1 className="text-xl font-bold text-yellow-400">
              Administración de Usuario
            </h1>
            <p className="text-sm text-muted-foreground">
              ID: {usuarioId} - Editando configuración del usuario
            </p>
          </div>
        </div>
        
        <UsuariosTabs activeTab={activeTab} />
      </div>

      {/* Contenido del tab */}
      <div className="flex-1 overflow-y-auto mt-4 rounded-2xl bg-muted p-6">
        {renderTabContent()}
      </div>
    </div>
  );
}