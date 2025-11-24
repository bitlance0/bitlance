// src/components/layout/AppSidebar.tsx
"use client";

import {
  LineChart, User, UserCog, KeyRound, Clock3, UploadCloud, Wallet,
  TrendingUp, Users, BarChart3, Activity, ChevronDown,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useUserStore } from "@/stores/useUserStore";

type RoleId = "user" | "collaborator" | "admin" | "super";
type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: RoleId;
  requiredPerm?: string;
};

const items: NavItem[] = [
  { title: "Plataforma Trading", url: "/", icon: LineChart },
  { title: "Mis Cuentas", url: "/cuentas", icon: User },
  { title: "Detalles Personales", url: "/detalles", icon: UserCog },
  { title: "Cambiar Contraseña", url: "/cambiar-password", icon: KeyRound },
  { title: "Historial de Trading", url: "/historial", icon: Clock3 },
  { title: "Subir documentos", url: "/documentos", icon: UploadCloud },
  { title: "Retiros", url: "/retiros", icon: Wallet, requiredPerm: "trading_operate" },
  { title: "Transacciones financieras", url: "/transacciones", icon: TrendingUp },
];

const adminItems: NavItem[] = [
  { title: "Usuarios", url: "/admin/usuarios", icon: Users, requiredPerm: "admin_user_mgmt" },
  { title: "Pagos", url: "/admin/pagos", icon: Wallet, requiredPerm: "payments_gateway" },
  // { title: "Usuarios", url: "/admin/usuarios", icon: Users, requiredRole: "admin" },
  { title: "Movimientos", url: "/admin/movimientos", icon: Activity, requiredPerm: "admin_balance_mgmt" },
  { title: "Dashboard", url: "/admin/dashboard", icon: BarChart3, requiredRole: "admin" },
];

const AppSidebar = () => {
  const pathname = usePathname();
  const { isMobile, setOpen } = useSidebar();

  // RBAC del store
  const role = useUserStore((s) => s.role);
  const permissions = useUserStore((s) => s.permissions);
  const hasRoleAtLeast = useUserStore((s) => s.hasRoleAtLeast);

  // Visibilidad por item (usa el mapa de permisos actual)
  const canSee = (item: NavItem) => {
    const okRole = item.requiredRole ? hasRoleAtLeast(item.requiredRole) : true;
    const okPerm = item.requiredPerm ? !!permissions[item.requiredPerm] : true;
    return okRole && okPerm;
  };

  // 👉 depende de `permissions` (no de la función)
  const userNav = useMemo(() => items.filter(canSee), [role, permissions]);
  const adminNav = useMemo(() => adminItems.filter(canSee), [role, permissions]);

  const showAdminGroup = useMemo(() => {
    return hasRoleAtLeast("admin") || adminNav.length > 0;
  }, [adminNav.length, hasRoleAtLeast]);

  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [pathname, isMobile, setOpen]);

  const handleLinkClick = () => {
    if (isMobile) setTimeout(() => setOpen(false), 50);
  };

  return (
    <Sidebar>
      <div className="flex items-center h-20 border-b">
        <Link href="/" className="flex items-center gap-2 px-4 py-3" onClick={handleLinkClick}>
          <div className="relative w-15 h-15">
            <Image src="/logo.png" alt="Logo" fill style={{ objectFit: "contain" }} className="rounded-full" />
          </div>
          <span className="font-semibold text-lg select-none" style={{ color: "var(--amarillo-principal)" }}>
            BitLance
          </span>
        </Link>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {userNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link
                      href={item.url}
                      onClick={handleLinkClick}
                      className={`flex items-center gap-3 px-4 py-2 text-sm rounded-md transition-colors ${
                        pathname === item.url ? "bg-border text-yellow-400" : "hover:bg-border hover:text-yellow-400"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdminGroup && (
          <SidebarGroup>
            <SidebarGroupContent>
              <details className="group" open={pathname.startsWith("/admin")}>
                <summary
                  className={`flex justify-between items-center cursor-pointer px-4 py-2 text-sm font-semibold rounded-md transition
                    hover:bg-border
                    text-sidebar-foreground group-open:text-[var(--amarillo-principal)]`}
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 transition-colors" />
                    <span>Administrar</span>
                  </div>
                  <ChevronDown className="w-4 h-4 transition-transform duration-300 group-open:rotate-180 text-sidebar-foreground group-open:text-[var(--amarillo-principal)]" />
                </summary>

                <div className="mt-2 pl-5">
                  <SidebarMenu>
                    {adminNav.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
                          className="text-sm"
                        >
                          <Link href={item.url} onClick={handleLinkClick}>
                            <item.icon className="w-5 h-5" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </div>
              </details>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
