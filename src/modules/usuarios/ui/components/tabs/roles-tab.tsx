// src/modules/usuarios/ui/components/tabs/permisos-tab.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface RolesTabProps {
  usuarioId?: string;
}

type Rol = {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: string[];
  usuarios: number;
};


// export default function RolesTab({ usuarioId }: RolesTabProps) {
export function RolesTab({ }: RolesTabProps) {
  // const [roles, setRoles] = useState<Rol[]>([
  const [roles, setRoles] = useState<Rol[]>([
    {
      id: "1",
      nombre: "Administrador",
      descripcion: "Acceso completo al sistema",
      permisos: ["todos"],
      usuarios: 3
    },
    {
      id: "2",
      nombre: "Trader",
      descripcion: "Acceso a operaciones y análisis",
      permisos: ["operar", "analizar", "ver_reportes"],
      usuarios: 45
    },
    {
      id: "3",
      nombre: "Viewer",
      descripcion: "Solo lectura de datos",
      permisos: ["ver_datos", "ver_reportes"],
      usuarios: 12
    },
    {
      id: "4",
      nombre: "Support",
      descripcion: "Soporte a usuarios",
      permisos: ["ver_usuarios", "soporte", "ver_reportes"],
      usuarios: 5
    }
  ]);

  const [usuarioRoles, setUsuarioRoles] = useState<string[]>(["2"]);
  const [nuevoRol, setNuevoRol] = useState({ nombre: "", descripcion: "" });

  const toggleRolUsuario = (rolId: string) => {
    setUsuarioRoles(prev => 
      prev.includes(rolId) 
        ? prev.filter(id => id !== rolId)
        : [...prev, rolId]
    );
  };

  const agregarRol = () => {
    if (nuevoRol.nombre.trim()) {
      const rol: Rol = {
        id: Date.now().toString(),
        nombre: nuevoRol.nombre,
        descripcion: nuevoRol.descripcion,
        permisos: [],
        usuarios: 0
      };
      setRoles([...roles, rol]);
      setNuevoRol({ nombre: "", descripcion: "" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Roles del Usuario Actual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-yellow-400">Roles Asignados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {roles.map(rol => (
            <div key={rol.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-4">
                <Checkbox 
                  checked={usuarioRoles.includes(rol.id)}
                  onCheckedChange={() => toggleRolUsuario(rol.id)}
                />
                <div>
                  <h4 className="font-medium">{rol.nombre}</h4>
                  <p className="text-sm text-muted-foreground">{rol.descripcion}</p>
                </div>
              </div>
              <Badge variant="outline">{rol.usuarios} usuarios</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Gestión de Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-yellow-400">Gestión de Roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulario para nuevo rol */}
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
            <div>
              <label className="text-sm font-medium">Nombre del Rol</label>
              <Input 
                value={nuevoRol.nombre}
                onChange={(e) => setNuevoRol({...nuevoRol, nombre: e.target.value})}
                placeholder="Ej: Analista Senior"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Input 
                value={nuevoRol.descripcion}
                onChange={(e) => setNuevoRol({...nuevoRol, descripcion: e.target.value})}
                placeholder="Descripción del rol"
              />
            </div>
            <div className="col-span-2">
              <Button onClick={agregarRol} className="bg-yellow-400 text-black hover:bg-yellow-500">
                Crear Nuevo Rol
              </Button>
            </div>
          </div>

          {/* Lista de todos los roles */}
          <div className="space-y-2">
            <h4 className="font-medium">Todos los Roles del Sistema</h4>
            {roles.map(rol => (
              <div key={rol.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <span className="font-medium">{rol.nombre}</span>
                  <span className="text-sm text-muted-foreground ml-2">- {rol.descripcion}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Editar</Button>
                  <Button variant="destructive" size="sm">Eliminar</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}