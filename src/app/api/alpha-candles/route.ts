import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

/* ---------------------- Tipos ---------------------- */
type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

/* ---------------------- Configuración ---------------------- */
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const CACHE_TTL = 60 * 5; // 5 minutos
const HIST_WINDOW = 60;   // velas por bloque histórico (no cambia contrato)
const REQUEST_TIMEOUT_MS = 6500; // ⏱️ timeout duro para proveedor

/* ---------------------- Utilidades ---------------------- */
async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function isRateLimitOrError(json: unknown): boolean {
  if (!json || typeof json !== "object") return true;
  const obj = json as Record<string, unknown>;
  return !!(obj["Note"] || obj["Error Message"] || Object.keys(obj).length === 0);
}

function dateToUTCTimestampInput(value: string | number): number {
  // acepta numero (segundos) o string ISO o "YYYY-MM-DD hh:mm:ss"
  if (typeof value === "number") return Math.floor(value);
  if (/^\d+$/.test(String(value))) return Math.floor(Number(value)); // segundos en string
  const s = String(value).replace(" ", "T");
  const d = new Date(s);
  return Math.floor(d.getTime() / 1000);
}

function removeDuplicatesAndSort(candles: Candle[]): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of candles) map.set(c.time, c);
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

/* ---------------------- Cache helpers (tolerante) ---------------------- */
async function getCachedData(
  symbol: string,
  interval: string,
  historical: string | null,
  direction?: string | null,
  referenceTime?: string | null
): Promise<Candle[] | null> {
  try {
    const cacheKey = `alpha:${symbol}:${interval}:${historical}:${direction}:${referenceTime}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      if (typeof cached === "string") {
        try { return JSON.parse(cached) as Candle[]; } catch {}
      }
      if (Array.isArray(cached)) return cached as Candle[];
      if ((cached as any).value && Array.isArray((cached as any).value)) return (cached as any).value as Candle[];
      console.warn("⚠️ Cached value con formato inesperado:", typeof cached);
    }
    return null;
  } catch (error) {
    console.error("Error accediendo a Redis:", error);
    return null;
  }
}

async function setCachedData(
  symbol: string,
  interval: string,
  historical: string | null,
  direction: string | null,
  referenceTime: string | null,
  data: Candle[]
): Promise<void> {
  try {
    const cacheKey = `alpha:${symbol}:${interval}:${historical}:${direction}:${referenceTime}`;
    await redis.set(cacheKey, JSON.stringify(data), { ex: CACHE_TTL });
  } catch (error) {
    console.error("Error guardando en Redis:", error);
  }
}

/* ---------------------- Helpers de proveedor ---------------------- */
// Detecta si es un par FX (6 letras A-Z)
const isFxPair = (sym: string) => /^[A-Z]{6}$/.test(sym);

// Construye URL correcta por mercado/función de Alpha Vantage
function buildAlphaUrl(symbol: string, interval: string, outputsize: "compact" | "full") {
  if (isFxPair(symbol)) {
    const from_symbol = symbol.slice(0, 3);
    const to_symbol = symbol.slice(3, 6);
    // FX usa FX_INTRADAY y otra forma de params
    return `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${from_symbol}&to_symbol=${to_symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${API_KEY}`;
  }
  // Acciones/ETFs/índices simulados: TIME_SERIES_INTRADAY
  return `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${API_KEY}`;
}

// Ejecuta fetch con timeout duro (abort)
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { cache: "no-store", signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Parsea respuesta a velas, manejando llaves distintas de FX vs TIME_SERIES
function parseAlphaSeries(json: any, interval: string, isFx: boolean): Candle[] {
  const seriesKey = isFx ? `Time Series FX (${interval})` : `Time Series (${interval})`;
  const series = json?.[seriesKey];
  if (!series) throw new Error("No series found from Alpha");

  const candles: Candle[] = Object.entries(series).map(([time, v]: any) => {
    // time Alpha: "YYYY-MM-DD hh:mm:ss"
    const t = String(time).replace(" ", "T");
    return {
      time: Math.floor(new Date(t + "Z").getTime() / 1000),
      open: parseFloat(v["1. open"]),
      high: parseFloat(v["2. high"]),
      low: parseFloat(v["3. low"]),
      close: parseFloat(v["4. close"]),
      // FX no trae volumen (omitimos); en TIME_SERIES sí, pero no es vital para el front
      volume: v["5. volume"] !== undefined ? parseFloat(v["5. volume"]) : undefined,
    };
  });

  return removeDuplicatesAndSort(candles);
}

/* ---------------------- Alpha Vantage fetch ---------------------- */
async function fetchFromAlpha(symbol: string, interval: string, outputsize: "compact" | "full" = "compact"): Promise<Candle[]> {
  const isFx = isFxPair(symbol);
  const endpoint = buildAlphaUrl(symbol, interval, outputsize);

  const res = await fetchWithTimeout(endpoint, REQUEST_TIMEOUT_MS);
  const json = await safeJson(res);

  if (!res.ok || !json || isRateLimitOrError(json)) {
    throw new Error("Rate limit or invalid data");
  }

  return parseAlphaSeries(json, interval, isFx);
}

async function fetchHistoricalData(
  symbol: string,
  interval: string,
  direction: "forward" | "backward",
  referenceTime: string
): Promise<Candle[]> {
  try {
    // Obtenemos TODO (full) y filtramos en memoria: más robusto y un solo punto de parseo.
    const all = await fetchFromAlpha(symbol, interval, "full");

    const uniqueCandles = removeDuplicatesAndSort(all);

    // Soportar timestamps en segundos (epoch) o fecha
    const referenceTimestamp =
      /^\d+$/.test(referenceTime)
        ? parseInt(referenceTime, 10)
        : dateToUTCTimestampInput(referenceTime);

    let filtered: Candle[] = [];

    if (direction === "backward") {
      filtered = uniqueCandles.filter(c => c.time < referenceTimestamp);
      if (filtered.length === 0) {
        console.warn("⚠️ No hay datos previos al timestamp, devolviendo primeras velas disponibles.");
        filtered = uniqueCandles.slice(0, Math.min(HIST_WINDOW, uniqueCandles.length));
      } else {
        filtered = filtered.slice(-Math.min(HIST_WINDOW, filtered.length));
      }
    } else {
      filtered = uniqueCandles.filter(c => c.time > referenceTimestamp);
      if (filtered.length === 0) {
        console.warn("⚠️ No hay datos posteriores al timestamp, devolviendo últimas velas disponibles.");
        filtered = uniqueCandles.slice(-Math.min(HIST_WINDOW, uniqueCandles.length));
      } else {
        filtered = filtered.slice(0, Math.min(HIST_WINDOW, filtered.length));
      }
    }

    return filtered;
  } catch (error) {
    console.error("Error en fetchHistoricalData:", error);
    return [];
  }
}

/* ---------------------- Handler principal ---------------------- */
export async function GET(req: Request) {
  if (!API_KEY) {
    return NextResponse.json({ error: "ALPHA_VANTAGE_API_KEY no configurada" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "AAPL").toUpperCase();
  const interval = searchParams.get("interval") || "5min";
  const direction = searchParams.get("direction") || null;
  const referenceTime = searchParams.get("referenceTime") || null;
  const historical = searchParams.get("historical") || null;

  // Cabeceras de no-buffering para que el cliente no quede esperando caches intermedios
  const jsonHeaders = {
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
  } as const;

  try {
    // 1) Cache
    const cached = await getCachedData(symbol, interval, historical, direction, referenceTime);
    if (cached) {
      return new NextResponse(JSON.stringify(cached), { status: 200, headers: jsonHeaders });
    }

    // 2) Fetch a proveedor con timeout
    let data: Candle[] = [];

    if (historical === "true" && direction && referenceTime) {
      data = await fetchHistoricalData(symbol, interval, direction as any, referenceTime);
    } else {
      data = await fetchFromAlpha(symbol, interval, "compact");
    }

    if (!data || data.length === 0) {
      return new NextResponse(JSON.stringify({ error: "No se encontraron datos" }), { status: 404, headers: jsonHeaders });
    }

    const final = removeDuplicatesAndSort(data);
    await setCachedData(symbol, interval, historical, direction, referenceTime, final);

    return new NextResponse(JSON.stringify(final), { status: 200, headers: jsonHeaders });
  } catch (err: any) {
    const msg = String(err?.message || "");
    console.error("❌ Error al obtener datos desde Alpha Vantage:", msg);

    // 3) Intento de servir desde cache “parcial” si lo hubiera (resiliencia)
    const fallback = await getCachedData(symbol, interval, historical, direction, referenceTime);
    if (fallback && fallback.length) {
      // Servimos 200 con datos cacheados para no romper UX
      return new NextResponse(JSON.stringify(fallback), { status: 200, headers: jsonHeaders });
    }

    if (msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("timeout")) {
      // Timeout del proveedor: 504 explícito
      return new NextResponse(JSON.stringify({ error: "Tiempo de espera agotado consultando proveedor." }), { status: 504, headers: jsonHeaders });
    }
    if (msg.toLowerCase().includes("rate limit")) {
      return new NextResponse(JSON.stringify({ error: "Límite de API de Alpha Vantage alcanzado." }), { status: 429, headers: jsonHeaders });
    }
    return new NextResponse(JSON.stringify({ error: "Error al obtener datos desde API" }), { status: 500, headers: jsonHeaders });
  }
}
