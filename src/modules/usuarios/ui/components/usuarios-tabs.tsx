// src/modules/usuarios/ui/components/usuarios-tabs.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabs = ["General", "Cuentas", "Permisos"]; // "Roles", 

export default function UsuariosTabs({ activeTab }: { activeTab: string }) {
  const router = useRouter();
  const pathname = usePathname(); // ✅ obtiene la ruta actual

  // const handleClick = (tab: string) => {
  const handleClick = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`);
  };

  return (
    <Tabs value={activeTab}>
      <TabsList className="flex gap-2">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab}
            value={tab}
            onClick={() => handleClick(tab)} // ✅ ahora usa la ruta correcta
            className={`px-3 py-1 rounded-md border transition-colors
              ${activeTab === tab 
                ? "text-yellow-400 border-yellow-400"
                : "text-white border-transparent hover:text-yellow-300 hover:border-yellow-300"}`}
          >
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

