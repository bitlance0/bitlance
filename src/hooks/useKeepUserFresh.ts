// src/hooks/useKeepUserFresh.ts
"use client";

import { useEffect, useRef } from "react";
import { useUserStore } from "@/stores/useUserStore";

// ⏱️ Intervalo de refresco (ajústalo a tu gusto)
const POLLING_MS = 300_000; // 5 min

function shallowEqualPerms(a: Record<string, boolean>, b: Record<string, boolean>) {
  if (a === b) return true;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

export function useKeepUserFresh() {
  const user = useUserStore((s) => s.user);
  const role = useUserStore((s) => s.role);
  const permissions = useUserStore((s) => s.permissions);

  const _setUserIfChanged = useUserStore((s) => s._setUserIfChanged);
  const _markSynced = useUserStore((s) => s._markSynced);
  const setRole = useUserStore((s) => s.setRole);
  const setPermissions = useUserStore((s) => s.setPermissions);

  const fetchingRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false); // evita reentradas por focus + interval a la vez

  async function refetch() {
    // Evitar reentradas si ya hay una ejecución en curso
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    // Aborta una corrida anterior si seguía viva
    if (fetchingRef.current) fetchingRef.current.abort();
    const ac = new AbortController();
    fetchingRef.current = ac;

    try {
      const [uRes, rRes, pRes] = await Promise.allSettled([
        fetch("/api/user/me", { signal: ac.signal, cache: "no-store", credentials: "include" }),
        fetch("/api/user/me/role", { signal: ac.signal, cache: "no-store", credentials: "include" }),
        fetch("/api/user/me/permissions", { signal: ac.signal, cache: "no-store", credentials: "include" }),
      ]);

      // 1) Usuario
      if (uRes.status === "fulfilled" && uRes.value.ok) {
        const freshUser = await uRes.value.json();
        _setUserIfChanged(freshUser);
      }

      // 2) Rol
      if (rRes.status === "fulfilled" && rRes.value.ok) {
        const { roleId } = await rRes.value.json();
        if (roleId && roleId !== role) setRole(roleId);
      }

      // 3) Permisos
      if (pRes.status === "fulfilled" && pRes.value.ok) {
        const { permissions: freshPerms } = await pRes.value.json();
        if (freshPerms && !shallowEqualPerms(freshPerms, permissions)) {
          setPermissions(freshPerms);
        }
      }
    } catch (e: any) {
      // Silenciar aborts normales; loguear otras cosas si quieres
      if (e?.name !== "AbortError") {
        // console.warn("useKeepUserFresh error:", e);
      }
    } finally {
      _markSynced();
      if (fetchingRef.current === ac) fetchingRef.current = null;
      isRunningRef.current = false;
    }
  }

  useEffect(() => {
    if (!user?.id) return;

    // Primer fetch inmediato
    refetch();

    // Polling
    timerRef.current = setInterval(refetch, POLLING_MS);

    // Revalidación por foco/visibilidad
    const onFocus = () => refetch();
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      if (fetchingRef.current) fetchingRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // importa: solo depende de la existencia de user
}
