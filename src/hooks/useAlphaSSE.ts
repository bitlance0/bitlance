"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook SSE resiliente para recibir precios simulados en vivo.
 * Se reconecta automáticamente si el stream cae o no recibe datos.
 */
export function useAlphaSSE(market: string, options?: { reconnectMs?: number; idleTimeoutMs?: number }) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const esRef = useRef<EventSource | null>(null);
  const lastUpdate = useRef<number>(Date.now());
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const idleTimer = useRef<NodeJS.Timeout | null>(null);

  const reconnectMs = options?.reconnectMs ?? 3000; // intervalo de reconexión
  const idleTimeoutMs = options?.idleTimeoutMs ?? 15000; // si no llega nada, forzar reconexión

  useEffect(() => {
    if (!market) return;

    let closed = false;
    const openStream = () => {
      if (closed) return;

      const url = `/api/alpha-stream?market=${encodeURIComponent(market)}`;
      const es = new EventSource(url, { withCredentials: false });
      esRef.current = es;
      console.info(`[SSE] Connecting to ${url}`);

      const resetIdleTimer = () => {
        lastUpdate.current = Date.now();
        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => {
          console.warn("[SSE] Idle timeout, reconnecting...");
          try {
            es.close();
          } catch {}
          openStream();
        }, idleTimeoutMs);
      };

      // evento “prices”
      es.addEventListener("prices", (ev) => {
        resetIdleTimer();
        try {
          const data = JSON.parse((ev as MessageEvent).data);
          if (data?.prices && typeof data.prices === "object") {
            setPrices((prev) => ({ ...prev, ...data.prices }));
          }
        } catch (e) {
          console.warn("[SSE] JSON parse error", e);
        }
      });

      // heartbeats (": ping") o mensajes simples
      es.onmessage = (ev) => {
        if (ev.data?.startsWith(": ping")) {
          resetIdleTimer();
        } else if (ev.data) {
          try {
            const data = JSON.parse(ev.data);
            if (data?.prices) {
              resetIdleTimer();
              setPrices((prev) => ({ ...prev, ...data.prices }));
            }
          } catch {}
        }
      };

      es.onerror = (err) => {
        console.warn("[SSE] Error, reconnecting...", err);
        try {
          es.close();
        } catch {}
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => openStream(), reconnectMs);
      };
    };

    openStream();

    return () => {
      closed = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {}
      }
      esRef.current = null;
    };
  }, [market, reconnectMs, idleTimeoutMs]);

  return prices;
}
