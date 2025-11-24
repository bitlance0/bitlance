// src/app/api/alpha-stream/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

type Quote = {
  symbol: string;
  price: number;
  high?: number;
  low?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  latestTradingDay?: string;
  market?: string;
};

type CacheWrapper = { ts: number; data: Quote[] };

const CACHE_KEY = (m: string) => `alpha:market:${m}`;

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL!;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;
const redis =
  UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN })
    : null;

/* ---------- helpers deterministas para simulación ---------- */
function smallHash(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function xorshift32(seed: number) {
  let x = seed >>> 0;
  return function () {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x >>>= 0;
    x ^= x << 5;
    x >>>= 0;
    return x / 0xffffffff;
  };
}

// Simula pequeños movimientos a partir del snapshot base
function simulatePrices(
  wrapper: CacheWrapper,
  opts?: { maxPctPerMinute?: number; bucketMs?: number }
): Quote[] {
  const maxPctPerMinute = opts?.maxPctPerMinute ?? 0.25;
  const bucketMs = opts?.bucketMs ?? 1000;
  const now = Date.now();
  const elapsedMs = Math.max(0, now - wrapper.ts);
  const elapsedMinutes = elapsedMs / 60000;
  const maxTotalPct = elapsedMinutes * maxPctPerMinute;
  const cappedMaxPct = Math.min(maxTotalPct, Math.max(1, 3 * maxPctPerMinute));
  const bucketIndex = Math.floor(now / bucketMs);

  return (wrapper.data || []).map((q) => {
    if (typeof q.price !== "number" || Number.isNaN(q.price)) return { ...q };
    const seed = (smallHash(q.symbol + "::sim") ^ bucketIndex) >>> 0;
    const rand = xorshift32(seed)();
    const signed = rand * 2 - 1;
    const deltaFraction = signed * (cappedMaxPct / 100);
    const newPrice = q.price * (1 + deltaFraction);
    const prev =
      typeof q.previousClose === "number" ? q.previousClose : q.price;
    const change = newPrice - prev;
    const changePercent = prev !== 0 ? (change / prev) * 100 : 0;

    return {
      ...q,
      price: Number(newPrice.toFixed(6)),
      change: Number(change.toFixed(6)),
      changePercent: Number(changePercent.toFixed(6)),
    };
  });
}

// Lee wrapper desde Redis (si tu job ya lo escribe)
async function getBaseWrapper(market: string): Promise<CacheWrapper | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get<CacheWrapper | string>(CACHE_KEY(market));
    if (!raw) return null;
    const parsed =
      typeof raw === "string" ? (JSON.parse(raw) as CacheWrapper) : raw;
    if (!parsed || !Array.isArray(parsed.data) || typeof parsed.ts !== "number")
      return null;
    return parsed;
  } catch {
    return null;
  }
}

// 🔹 NUEVO: fallback a /api/markets cuando no hay wrapper en Redis
async function fetchBaseQuotesFromMarkets(origin: string, market: string): Promise<Quote[] | null> {
  try {
    const res = await fetch(
      `${origin}/api/markets?market=${encodeURIComponent(market)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Quote[];
    if (!Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const { searchParams } = url;
  const market = (searchParams.get("market") || "indices").toLowerCase();
  const origin = url.origin; // para llamar a /api/markets

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const safeClose = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {}
      };

      const write = (line: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(line));
        } catch {
          closed = true;
        }
      };
      const send = (obj: unknown) => write(`data: ${JSON.stringify(obj)}\n\n`);

      // Encabezado SSE
      write(`retry: 5000\n`);
      write(`event: ready\n`);
      write(`data: "ok"\n\n`);

      // Heartbeat cada 10s
      const heartbeat = setInterval(() => {
        if (closed) return;
        write(`: ping ${Date.now()}\n\n`);
      }, 10000);

      let lastPrices: Record<string, number> = {};
      let lastForcedAt = 0;

      // 🔹 NUEVO: baseFallback se llena una sola vez desde /api/markets si Redis está vacío
      let baseFallback: CacheWrapper | null = null;

      // (1) snapshot inicial
      try {
        let base = await getBaseWrapper(market);

        if (!base) {
          const baseQuotes = await fetchBaseQuotesFromMarkets(origin, market);
          if (baseQuotes && baseQuotes.length > 0) {
            base = {
              ts: Date.now(),
              data: baseQuotes,
            };
            baseFallback = base;
          }
        }

        if (base) {
          const simulated = simulatePrices(base, {
            maxPctPerMinute: 0.25,
            bucketMs: 1000,
          });
          const prices: Record<string, number> = {};
          for (const q of simulated) {
            if (q?.symbol && typeof q.price === "number") {
              prices[q.symbol.toUpperCase()] = q.price;
            }
          }
          lastPrices = prices;
          lastForcedAt = Date.now();
          send({ prices });
        } else {
          // ⬅ solo si falla Redis y también /api/markets
          send({ prices: {}, note: "no-base-wrapper-and-no-markets" });
        }
      } catch {
        send({ prices: {}, error: "initial_read_failed" });
      }

      // (2) loop cada 1s: re-simulación a partir de Redis o del fallback
      const tick = setInterval(async () => {
        if (closed) return;
        try {
          // intenta Redis primero, si no hay, usa el fallback en memoria
          const wrapper = (await getBaseWrapper(market)) ?? baseFallback;
          if (!wrapper) return;

          const simulated = simulatePrices(wrapper, {
            maxPctPerMinute: 0.25,
            bucketMs: 1000,
          });
          const prices: Record<string, number> = {};
          for (const q of simulated) {
            if (q?.symbol && typeof q.price === "number") {
              prices[q.symbol.toUpperCase()] = q.price;
            }
          }

          const changed =
            Object.keys(prices).length !== Object.keys(lastPrices).length ||
            Object.keys(prices).some((k) => prices[k] !== lastPrices[k]);

          const now = Date.now();
          const forceDue = now - lastForcedAt >= 10000; // fuerza cada 10s

          if (changed || forceDue) {
            lastPrices = prices;
            lastForcedAt = now;
            if (closed) return;
            send({ prices });
          }
        } catch {
          // sigue, heartbeat mantiene conexión
        }
      }, 1000);

      // (3) auto-cierre a los 120s
      const lifetime = setTimeout(() => {
        safeClose();
        clearInterval(tick);
        clearInterval(heartbeat);
        clearTimeout(lifetime);
      }, 120000);

      // (4) cleanup cuando el cliente cierra
      const onAbort = () => {
        clearInterval(tick);
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        safeClose();
      };

      // Nota: si quieres, puedes enganchar onAbort a req.signal cuando Next lo soporte
      // req.signal.addEventListener("abort", onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
