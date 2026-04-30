// src/components/layout/Navbar.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ChevronsLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { useUserStore } from "@/stores/useUserStore";

export function Navbar() {
  const { user, clearUser } = useUserStore();
  const router = useRouter();
  const { toggleSidebar, state } = useSidebar();

  const handleLogout = () => {
    authClient.signOut();
    clearUser();
    router.push("/landing");
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={state === "collapsed" ? "Expandir panel lateral" : "Contraer panel lateral"}
          title={state === "collapsed" ? "Expandir panel lateral" : "Contraer panel lateral"}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--card)] text-[var(--color-text)] transition-all duration-200 hover:border-[var(--amarillo-principal)]/30 hover:bg-[var(--amarillo-principal)]/12 hover:text-[var(--amarillo-principal)] ${
            state === "expanded" ? "md:invisible md:pointer-events-none md:opacity-0" : "opacity-100"
          }`}
        >
          <ChevronsLeft
            className={`size-4 transition-transform duration-200 ${state === "collapsed" ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Label className="flex cursor-pointer items-center rounded-lg px-2 py-1.5 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--card)]">
              {user?.name ?? "Usuario"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="ml-1 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Label>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push("/cuentas")}>Mi Cuenta</DropdownMenuItem>
            <DropdownMenuItem>Centro de Ayuda</DropdownMenuItem>
            <DropdownMenuItem className="text-red-300" onClick={handleLogout}>
              Salir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
