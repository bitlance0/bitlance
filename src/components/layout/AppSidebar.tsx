"use client";

import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronsLeft,
  Clock3,
  KeyRound,
  LineChart,
  TrendingUp,
  UploadCloud,
  User,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
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
  { title: "Movimientos", url: "/admin/movimientos", icon: Activity, requiredPerm: "admin_balance_mgmt" },
  { title: "Dashboard", url: "/admin/dashboard", icon: BarChart3, requiredRole: "admin" },
];

function IconIndicator({
  icon: Icon,
  active,
  showDot,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  showDot: boolean;
}) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <Icon className="h-5 w-5" />
      {showDot && (
        <>
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_2px_var(--sidebar-bg)]" />
          <span
            className={cn(
              "absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400/60",
              !active && "animate-ping"
            )}
          />
        </>
      )}
    </span>
  );
}

function AppSidebarNavItem({
  item,
  pathname,
  onClick,
  showDot,
  nested = false,
}: {
  item: NavItem;
  pathname: string;
  onClick: () => void;
  showDot?: boolean;
  nested?: boolean;
}) {
  const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`);

  return (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        className={cn(
          "h-10 rounded-lg px-3 text-[13px] font-medium transition-all duration-200",
          "group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
          nested &&
            "ml-3 h-9 rounded-md border-l border-sidebar-border/70 pl-4 text-[12.5px] group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:pl-0",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--sidebar-accent-foreground)_18%,transparent)]"
        )}
      >
        <Link href={item.url} onClick={onClick}>
          <IconIndicator icon={item.icon} active={isActive} showDot={Boolean(showDot)} />
          <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

const AppSidebar = () => {
  const pathname = usePathname();
  const { isMobile, setOpen, state, toggleSidebar } = useSidebar();
  const [withdrawalAlerts, setWithdrawalAlerts] = useState({
    hasUserPendingWithdrawals: false,
    hasAdminPendingWithdrawals: false,
    canReviewWithdrawals: false,
  });

  const permissions = useUserStore((s) => s.permissions);
  const hasRoleAtLeast = useUserStore((s) => s.hasRoleAtLeast);

  const canSee = (item: NavItem) => {
    const okRole = item.requiredRole ? hasRoleAtLeast(item.requiredRole) : true;
    const okPerm = item.requiredPerm ? !!permissions[item.requiredPerm] : true;
    return okRole && okPerm;
  };

  const userNav = useMemo(() => items.filter(canSee), [permissions, hasRoleAtLeast]);
  const adminNav = useMemo(() => adminItems.filter(canSee), [permissions, hasRoleAtLeast]);

  const showAdminGroup = useMemo(() => {
    return hasRoleAtLeast("admin") || adminNav.length > 0;
  }, [adminNav.length, hasRoleAtLeast]);

  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [pathname, isMobile, setOpen]);

  useEffect(() => {
    const ac = new AbortController();
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function loadWithdrawalAlerts(signal?: AbortSignal) {
      try {
        const res = await fetch("/api/withdrawals/notifications", {
          cache: "no-store",
          credentials: "include",
          signal,
        });

        if (!res.ok) return;
        const data = await res.json();

        setWithdrawalAlerts({
          hasUserPendingWithdrawals: Boolean(data.hasUserPendingWithdrawals),
          hasAdminPendingWithdrawals: Boolean(data.hasAdminPendingWithdrawals),
          canReviewWithdrawals: Boolean(data.canReviewWithdrawals),
        });
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.error("No se pudieron cargar alertas de retiros:", error);
        }
      }
    }

    void loadWithdrawalAlerts(ac.signal);

    intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadWithdrawalAlerts();
      }
    }, 15000);

    const onFocus = () => {
      void loadWithdrawalAlerts();
    };

    const onWithdrawalChange = () => {
      void loadWithdrawalAlerts();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("withdrawals:changed", onWithdrawalChange as EventListener);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      ac.abort();
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("withdrawals:changed", onWithdrawalChange as EventListener);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const handleLinkClick = () => {
    if (isMobile) setTimeout(() => setOpen(false), 50);
  };

  const isCollapsed = state === "collapsed" && !isMobile;
  const adminSectionActive = pathname.startsWith("/admin");

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border/60 bg-sidebar shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]"
    >
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border/70 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sidebar-accent/50 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1"
          onClick={handleLinkClick}
        >
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl">
            <Image src="/logo.png" alt="Logo" fill style={{ objectFit: "contain" }} className="rounded-xl" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-[15px] font-semibold tracking-[0.01em] text-[var(--amarillo-principal)]">
              BitLance
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Expandir sidebar" : "Contraer sidebar"}
          title={isCollapsed ? "Expandir sidebar" : "Contraer sidebar"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sidebar-border/70 bg-[var(--card)] text-[var(--color-text)] transition-all duration-200 hover:border-[var(--amarillo-principal)]/30 hover:bg-[var(--amarillo-principal)]/12 hover:text-[var(--amarillo-principal)] group-data-[collapsible=icon]:hidden"
        >
          <ChevronsLeft
            className={cn("h-4 w-4 transition-transform duration-200", isCollapsed && "rotate-180")}
          />
        </button>
      </div>

      <SidebarContent className="gap-5 px-2 py-3 group-data-[collapsible=icon]:px-1.5">
        <SidebarGroup className="border-b-0 px-1">
          <SidebarGroupContent>
            <div className="mb-2 px-2 group-data-[collapsible=icon]:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">
                Principal
              </p>
            </div>
            <SidebarMenu className="space-y-1">
              {userNav.map((item) => (
                <AppSidebarNavItem
                  key={item.title}
                  item={item}
                  pathname={pathname}
                  onClick={handleLinkClick}
                  showDot={item.url === "/retiros" && withdrawalAlerts.hasUserPendingWithdrawals}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdminGroup && (
          <SidebarGroup className="border-b-0 px-1">
            <SidebarGroupContent>
              {isCollapsed ? (
                <SidebarMenu className="space-y-1 border-t border-sidebar-border/60 pt-3">
                  {adminNav.map((item) => (
                    <AppSidebarNavItem
                      key={item.title}
                      item={item}
                      pathname={pathname}
                      onClick={handleLinkClick}
                      showDot={
                        item.url === "/admin/movimientos" &&
                        withdrawalAlerts.hasAdminPendingWithdrawals &&
                        withdrawalAlerts.canReviewWithdrawals
                      }
                    />
                  ))}
                </SidebarMenu>
              ) : (
                <details className="group" open={adminSectionActive}>
                  <div className="mb-2 px-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">
                      Administración
                    </p>
                  </div>
                  <summary
                    className={cn(
                      "flex list-none items-center justify-between rounded-lg px-3 py-2.5 text-[13px] font-medium text-sidebar-foreground transition-colors",
                      "cursor-pointer hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground",
                      adminSectionActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <IconIndicator
                        icon={Activity}
                        active={adminSectionActive}
                        showDot={withdrawalAlerts.hasAdminPendingWithdrawals}
                      />
                      <span>Administrar</span>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
                  </summary>

                  <div className="mt-2">
                    <SidebarMenu className="space-y-1">
                      {adminNav.map((item) => (
                        <AppSidebarNavItem
                          key={item.title}
                          item={item}
                          pathname={pathname}
                          onClick={handleLinkClick}
                          nested
                          showDot={
                            item.url === "/admin/movimientos" &&
                            withdrawalAlerts.hasAdminPendingWithdrawals &&
                            withdrawalAlerts.canReviewWithdrawals
                          }
                        />
                      ))}
                    </SidebarMenu>
                  </div>
                </details>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
