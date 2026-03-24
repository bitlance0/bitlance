// src/hooks/useCachedFetch.ts - VERSIÓN MEJORADA
"use client";

import { useEffect, useRef, useState, useMemo } from "react";

type FetchResult<T = unknown> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated?: number;
};

const CACHE = new Map<string, { data: unknown; timestamp: number }>();
const IN_FLIGHT = new Map<string, Promise<unknown>>();
const ERROR_CACHE = new Map<string, { error: string; timestamp: number }>();
const ERROR_CACHE_TTL_MS = 20_000;

// 🔹 Helper para crear una clave de dependencias estable
function createDepsKey(dependencies: unknown[]): string {
  return dependencies.map(dep => {
    if (dep === null || dep === undefined) return String(dep);
    if (typeof dep === 'object') return JSON.stringify(dep);
    return String(dep);
  }).join('|');
}

export default function useCachedFetch<T = unknown>(
  url?: string | null, 
  dependencies: unknown[] = []
): FetchResult<T> {
  const [state, setState] = useState<FetchResult<T>>({ 
    data: null, 
    loading: !!url, 
    error: null 
  });
  const abortRef = useRef<AbortController | null>(null);

  // 🔹 Crear una clave estable para las dependencias
  const depsKey = useMemo(() => createDepsKey(dependencies), [dependencies]);

  useEffect(() => {
    if (!url) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    const cached = CACHE.get(url);
    
    if (cached) {
      setState({ 
        data: cached.data as T, 
        loading: false, 
        error: null,
        lastUpdated: cached.timestamp
      });
      return;
    }

    const cachedError = ERROR_CACHE.get(url);
    if (cachedError && Date.now() - cachedError.timestamp < ERROR_CACHE_TTL_MS) {
      setState({
        data: null,
        loading: false,
        error: cachedError.error,
      });
      return;
    }
    if (cachedError) {
      ERROR_CACHE.delete(url);
    }

    const inFlight = IN_FLIGHT.get(url);
    if (inFlight) {
      setState((s) => ({ ...s, loading: true }));
      inFlight
        .then((res) => {
          if (cancelled) return;
          setState({ 
            data: res as T, 
            loading: false, 
            error: null,
            lastUpdated: Date.now()
          });
        })
        .catch((err) => {
          if (cancelled) return;
          setState({ 
            data: null, 
            loading: false, 
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        });
      return;
    }

    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const fetchPromise = fetch(url, { signal }).then(async (res) => {
      let parsedBody: any = null;

      try {
        parsedBody = await res.clone().json();
      } catch {
        parsedBody = null;
      }

      if (!res.ok) {
        const apiError =
          (parsedBody && typeof parsedBody === "object" && parsedBody.error) ||
          null;
        const baseMessage = `HTTP ${res.status}`;
        throw new Error(apiError ? `${baseMessage}: ${apiError}` : baseMessage);
      }

      if (parsedBody !== null) {
        return parsedBody as T;
      }

      return res.json() as Promise<T>;
    });

    IN_FLIGHT.set(url, fetchPromise);
    setState({ data: null, loading: true, error: null });

    fetchPromise
      .then((json) => {
        const timestamp = Date.now();
        CACHE.set(url, { data: json, timestamp });
        ERROR_CACHE.delete(url);
        IN_FLIGHT.delete(url);
        if (!cancelled) {
          setState({ 
            data: json, 
            loading: false, 
            error: null,
            lastUpdated: timestamp
          });
        }
      })
      .catch((err) => {
        IN_FLIGHT.delete(url);
        const errorMessage = err instanceof Error ? err.message : 'Fetch failed';
        ERROR_CACHE.set(url, {
          error: errorMessage,
          timestamp: Date.now(),
        });
        if (!cancelled) {
          setState({ 
            data: null, 
            loading: false, 
            error: errorMessage
          });
        }
      });

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  // 🔹 Dependencias claras y estables
  }, [url, depsKey]);

  return state;
}
