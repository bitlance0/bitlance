// src/components/AuthSync.tsx
"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { useUserStore } from "@/stores/useUserStore";
import { useKeepUserFresh } from "@/hooks/useKeepUserFresh";

export default function AuthSync({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  const setUser = useUserStore((s) => s.setUser);
  const setSession = useUserStore((s) => s.setSession);
  const setRole = useUserStore((s) => s.setRole);
  const setPermissions = useUserStore((s) => s.setPermissions);
  const clearUser = useUserStore((s) => s.clearUser);
  const _setUserIfChanged = useUserStore((s) => s._setUserIfChanged);
  const lastSyncedAt = useUserStore((s) => s.lastSyncedAt);

  // ✅ Evita reentradas mientras un fetch anterior está en progreso
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!session?.user && !isPending) {
      clearUser();
      return;
    }

    // ⚙️ Si ya se está sincronizando, evitamos nueva ejecución
    if (isSyncingRef.current) return;

    const ac = new AbortController();
    isSyncingRef.current = true;

    async function syncUser() {
      try {
        // Evita sincronizaciones demasiado frecuentes (< 10 s)
        if (lastSyncedAt && Date.now() - lastSyncedAt < 10000) return;

        const [uRes, rRes, pRes] = await Promise.allSettled([
          fetch("/api/user/me", { signal: ac.signal, cache: "no-store" }),
          fetch("/api/user/me/role", { signal: ac.signal, cache: "no-store" }),
          fetch("/api/user/me/permissions", { signal: ac.signal, cache: "no-store" }),
        ]);

        if (uRes.status === "fulfilled" && uRes.value.ok) {
          const dbUser = await uRes.value.json();
          _setUserIfChanged(dbUser);
          if (session) {
            setSession(session.session);
          }
        } else {
          console.warn("❌ No se pudo obtener usuario actual");
          clearUser();
          return;
        }

        if (rRes.status === "fulfilled" && rRes.value.ok) {
          const { roleId } = await rRes.value.json();
          setRole(roleId);
        }

        if (pRes.status === "fulfilled" && pRes.value.ok) {
          const { permissions } = await pRes.value.json();
          setPermissions(permissions);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Error AuthSync:", err);
          clearUser();
        }
      } finally {
        isSyncingRef.current = false;
      }
    }

    syncUser();

    // ❌ ya no abortamos al desmontar, así no se cancelan por micro-renders
    // return () => ac.abort();
  }, [
    session,
    isPending,
    lastSyncedAt,
    _setUserIfChanged,
    setSession,
    setRole,
    setPermissions,
    clearUser,
  ]);

  useKeepUserFresh();

  return <>{children}</>;
}
