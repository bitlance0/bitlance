// src/app/api/alpha-stream/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

/* ===================== Types ===================== */

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
  source?: "real" | "simulated" | "mock";
};

type CacheWrapper = {
  ts: number;
  data: Quote[];
  anchorTs?: number; // compat con /api/markets
};

/* ===================== Redis ===================== */

const CACHE_KEY = (m: string) => `alpha:market:${m}`;

const redis =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/* ===================== Deterministic helpers ===================== */

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
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x >>>= 0;
    x ^= x << 5;
    x >>>= 0;
    return x / 0xffffffff;
  };
}

/* ===================== Interpolation ONLY ===================== */

// ⚠️ NO simulación de mercado: solo smoothing visual
function interpolatePrices(
  wrapper: CacheWrapper,
  opts?: { maxPctPerMinute?: number; bucketMs?: number }
): Quote[] {
  const maxPctPerMinute = opts?.maxPctPerMinute ?? 0.03; // ⬅️ MUY bajo
  const bucketMs = opts?.bucketMs ?? 1000;

  const now = Date.now();
  const elapsedMs = Math.max(0, now - wrapper.ts);
  const elapsedMinutes = elapsedMs / 60000;
  const maxTotalPct = elapsedMinutes * maxPctPerMinute;
  const cappedPct = Math.min(maxTotalPct, maxPctPerMinute * 3);
  const bucketIndex = Math.floor(now / bucketMs);

  return wrapper.data.map((q) => {
    if (typeof q.price !== "number" || !Number.isFinite(q.price)) {
      return q;
    }

    const seed = (smallHash(q.symbol + "::interp") ^ bucketIndex) >>> 0;
    const rand = xorshift32(seed)() * 2 - 1;

    const deltaFraction = rand * (cappedPct / 100);
    const newPrice = q.price * (1 + deltaFraction);
    const prev =
      typeof q.previousClose === "number" ? q.previousClose : q.price;

    return {
      ...q,
      price: Number(newPrice.toFixed(6)),
      change: Number((newPrice - prev).toFixed(6)),
      changePercent: Number(
        prev !== 0 ? (((newPrice - prev) / prev) * 100).toFixed(6) : 0
      ),
    };
  });
}

/* ===================== Redis read ===================== */

async function getBaseWrapper(
  market: string
): Promise<CacheWrapper | null> {
  if (!redis) return null;

  try {
    const raw = await redis.get<CacheWrapper | string>(
      CACHE_KEY(market)
    );
    if (!raw) return null;

    const parsed =
      typeof raw === "string"
        ? (JSON.parse(raw) as CacheWrapper)
        : raw;

    if (
      !parsed ||
      typeof parsed.ts !== "number" ||
      !Array.isArray(parsed.data)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/* ===================== Fallback to /api/markets ===================== */

async function fetchFromMarkets(
  origin: string,
  market: string
): Promise<CacheWrapper | null> {
  try {
    const res = await fetch(
      `${origin}/api/markets?market=${encodeURIComponent(market)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as Quote[];
    if (!Array.isArray(data)) return null;

    return {
      ts: Date.now(),
      data,
    };
  } catch {
    return null;
  }
}

/* ===================== SSE Handler ===================== */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const market = (url.searchParams.get("market") || "indices").toLowerCase();
  const origin = url.origin;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const write = (line: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(line));
        } catch {
          closed = true;
        }
      };

      const send = (obj: unknown) =>
        write(`data: ${JSON.stringify(obj)}\n\n`);

      // SSE headers
      write(`retry: 5000\n`);
      write(`event: ready\n`);
      write(`data: "ok"\n\n`);

      // heartbeat
      const heartbeat = setInterval(() => {
        write(`: ping ${Date.now()}\n\n`);
      }, 10000);

      let lastPrices: Record<string, number> = {};
      let lastForcedAt = 0;

      let baseFallback: CacheWrapper | null = null;

      /* ---------- initial snapshot ---------- */
      try {
        let base = await getBaseWrapper(market);

        if (!base) {
          base = await fetchFromMarkets(origin, market);
          baseFallback = base;
        }

        if (base) {
          const interpolated = interpolatePrices(base);
          const prices: Record<string, number> = {};

          for (const q of interpolated) {
            if (q?.symbol && typeof q.price === "number") {
              prices[q.symbol.toUpperCase()] = q.price;
            }
          }

          lastPrices = prices;
          lastForcedAt = Date.now();
          send({ prices });
        } else {
          send({ prices: {}, note: "no-base-available" });
        }
      } catch {
        send({ prices: {}, error: "initial_snapshot_failed" });
      }

      /* ---------- tick loop ---------- */
      const tick = setInterval(async () => {
        if (closed) return;

        try {
          const wrapper =
            (await getBaseWrapper(market)) ?? baseFallback;
          if (!wrapper) return;

          const interpolated = interpolatePrices(wrapper);
          const prices: Record<string, number> = {};

          for (const q of interpolated) {
            if (q?.symbol && typeof q.price === "number") {
              prices[q.symbol.toUpperCase()] = q.price;
            }
          }

          const changed =
            Object.keys(prices).length !==
              Object.keys(lastPrices).length ||
            Object.keys(prices).some(
              (k) => prices[k] !== lastPrices[k]
            );

          const now = Date.now();
          const force = now - lastForcedAt >= 10_000;

          if (changed || force) {
            lastPrices = prices;
            lastForcedAt = now;
            send({ prices });
          }
        } catch {
          // noop
        }
      }, 1000);

      /* ---------- auto close ---------- */
      const lifetime = setTimeout(() => {
        closed = true;
        clearInterval(tick);
        clearInterval(heartbeat);
        controller.close();
      }, 120_000);

      /* ---------- cleanup ---------- */
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(tick);
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        try {
          controller.close();
        } catch {}
      };

      // cuando Next soporte req.signal:
      // req.signal.addEventListener("abort", cleanup);
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
