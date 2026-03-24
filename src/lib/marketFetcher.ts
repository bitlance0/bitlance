// src/lib/marketFetcher.ts
/**
 * Sistema centralizado de fetching de mercados con deduplicación automática.
 * Garantiza que solo haya una petición activa por mercado a la vez.
 */

type MarketQuote = any; // Importar el tipo real si está disponible

type InFlightRequest = {
  promise: Promise<MarketQuote[]>;
  controller: AbortController;
  timestamp: number;
};

const inflightRequests = new Map<string, InFlightRequest>();
const REQUEST_TIMEOUT = 30000; // 30s
const STALE_THRESHOLD = 60000; // Considerar request "viejo" después de 1min

/**
 * Limpia requests antiguos que no se completaron
 */
function cleanStaleRequests() {
  const now = Date.now();
  for (const [key, req] of inflightRequests.entries()) {
    if (now - req.timestamp > STALE_THRESHOLD) {
      req.controller.abort();
      inflightRequests.delete(key);
    }
  }
}

/**
 * Fetch de mercado con deduplicación automática.
 * Si ya hay un request en curso para el mismo mercado, retorna la misma promesa.
 */
export async function fetchMarketData(
  market: string,
  options?: {
    force?: boolean; // Forzar nuevo request aunque haya uno en curso
    signal?: AbortSignal; // Signal externo para cancelar
  }
): Promise<MarketQuote[]> {
  const key = market.toLowerCase();

  // Limpiar requests antiguos periódicamente
  cleanStaleRequests();

  // Si hay request en curso y no es forzado, retornar el mismo
  if (!options?.force && inflightRequests.has(key)) {
    console.log(`[marketFetcher] Reusing inflight request for ${market}`);
    const existing = inflightRequests.get(key)!;
    return existing.promise;
  }

  // Cancelar request previo si existe y es forzado
  if (options?.force && inflightRequests.has(key)) {
    const prev = inflightRequests.get(key)!;
    prev.controller.abort();
    inflightRequests.delete(key);
  }

  // Crear nuevo request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  // Escuchar signal externo si existe
  if (options?.signal) {
    options.signal.addEventListener("abort", () => controller.abort());
  }

  const promise = (async () => {
    try {
      const res = await fetch(
        `/api/markets?market=${encodeURIComponent(key)}`,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.error(`[marketFetcher] API returned ${res.status} for ${market}`);
        try {
          const errorData = await res.json();
          console.error("[marketFetcher] Error details:", errorData);
        } catch {
          // Ignorar
        }
        throw new Error(`Status ${res.status}`);
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        console.error("[marketFetcher] Invalid response format:", data);
        throw new Error("Invalid response format");
      }

      return data;
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.warn(`[marketFetcher] Request aborted for ${market}`);
      } else {
        console.error(`[marketFetcher] Fetch failed for ${market}:`, error);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, {
    promise,
    controller,
    timestamp: Date.now(),
  });

  return promise;
}

/**
 * Cancela todos los requests en curso
 */
export function cancelAllMarketRequests() {
  for (const [key, req] of inflightRequests.entries()) {
    req.controller.abort();
    inflightRequests.delete(key);
  }
}

/**
 * Cancela un request específico
 */
export function cancelMarketRequest(market: string) {
  const key = market.toLowerCase();
  const req = inflightRequests.get(key);
  if (req) {
    req.controller.abort();
    inflightRequests.delete(key);
  }
}

/**
 * Verifica si hay un request en curso para un mercado
 */
export function isMarketRequestInFlight(market: string): boolean {
  return inflightRequests.has(market.toLowerCase());
}

/**
 * Obtiene estadísticas de debugging
 */
export function getMarketFetcherStats() {
  const stats = Array.from(inflightRequests.entries()).map(([key, req]) => ({
    market: key,
    age: Date.now() - req.timestamp,
  }));

  return {
    activeRequests: stats.length,
    requests: stats,
  };
}

/**
 * Purga manualmente requests antiguos
 */
export function purgeStaleRequests() {
  cleanStaleRequests();
  return getMarketFetcherStats();
}
