// src/app/(app)/layout.tsx
"use client"; // 🔹 Esto permite usar hooks como useState

import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import { Navbar } from "@/components/layout/Navbar";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";

export default function AppLayout({ children }: { children: ReactNode }) {
  // const [mobileAsideOpen, setMobileAsideOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar lateral */}
        <AppSidebar />

        {/* Contenido principal */}
        <div className="flex flex-col flex-1 w-full">
          {/* Navbar arriba */}
          <Navbar />
          <div className="fixed mt-2 top-[80px] right-6 z-50 opacity-70 hover:opacity-100 transition-all">
            <ThemeSwitcher expandedWidth="w-40" />
        </div>
          {/* Contenido dinámico */}
          <main className="flex-1 w-full p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
