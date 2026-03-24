// src/trade-engine.ts
import "dotenv/config";
import { db } from "@/db";
import { trades } from "@/db/schema";
import { eq } from "drizzle-orm";
import SYMBOLS_MAP from "@/lib/symbolsMap";

type TradeRow = typeof trades.$inferSelect;

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

/* ========= Config ========= */
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"; // ⚠️ pon aquí el dominio de Render
const ACTIVATE_URL = `${APP_BASE_URL}/api/trade/pending/activate`;
const CLOSE_URL = `${APP_BASE_URL}/api/trade/close`;

const ENGINE_INTERVAL_MS = Number(process.env.TRADE_ENGINE_INTERVAL_MS ?? 5000); // 5s
const ENGINE_ENABLED = process.env.TRADE_ENGINE_ENABLED !== "false";

// Mercados válidos que podemos consultar
const VALID_MARKETS = Object.keys(SYMBOLS_MAP) as Array<keyof typeof SYMBOLS_MAP>;

/* ========= Helpers de mercado ========= */

function marketOfSymbol(sym: string | null): keyof typeof SYMBOLS_MAP | "acciones" {
  if (!sym) return "acciones";
  const S = sym.toUpperCase();
  for (const [m, arr] of Object.entries(SYMBOLS_MAP)) {
    if (arr.map((x) => x.toUpperCase()).includes(S))
      return m as keyof typeof SYMBOLS_MAP;
  }
  return "acciones";
}

/** Copiado del diálogo, adaptado para Node */
function isMarketOpenForMarket(market: string, now: Date): boolean {
  const utc = new Date(now.toISOString());
  const day = utc.getUTCDay(); // 0=Domingo ... 6=Sábado
  const hour = utc.getUTCHours();
  const minute = utc.getUTCMinutes();
  const timeMinutes = hour * 60 + minute;

  const inRange = (sh: number, sm: number, eh: number, em: number) => {
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    return timeMinutes >= start && timeMinutes <= end;
  };

  if (market === "crypto") {
    return true; // 24/7
  }

  if (market === "fx") {
    if (day === 0 || day === 6) return false;
    return true; // simplificado: 24h L–V
  }

  if (["indices", "acciones", "commodities"].includes(market)) {
    if (day === 0 || day === 6) return false;
    // NY 14:30–21:00 UTC
    return inRange(14, 30, 21, 0);
  }

  if (day === 0 || day === 6) return false;
  return inRange(13, 0, 21, 0);
}

/* ========= Utilidad ========== */

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/** Devuelve un Map SYMBOL -> price agregando datos de todos los mercados */
async function fetchPrices(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  
  try {
    for (const market of VALID_MARKETS) {
      try {
        const url = `${APP_BASE_URL}/api/markets?market=${market}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        
        if (!res.ok) {
          console.warn(`⚠️ trade-engine: error al llamar /api/markets para ${market}: ${res.status}`);
          continue;
        }
        
        const data: Quote[] = await res.json();
        
        if (!Array.isArray(data)) {
          console.warn(`⚠️ trade-engine: respuesta inválida para ${market}`);
          continue;
        }
        
        for (const q of data) {
          if (q && q.symbol && typeof q.price === "number") {
            map.set(q.symbol.toUpperCase(), q.price);
          }
        }
      } catch (error) {
        console.warn(`⚠️ trade-engine: error obteniendo mercado ${market}:`, error);
        continue;
      }
      
      // Pequeño delay entre requests para no sobrecargar
      await sleep(500);
    }
    
    if (map.size === 0) {
      console.error("❌ trade-engine: No se obtuvieron precios de ningún mercado");
    }
    
    return map;
  } catch (error) {
    console.error("❌ trade-engine: Error crítico en fetchPrices:", error);
    return new Map();
  }
}

/* ========= Lógica: procesar pendientes ========= */

async function processPendingTrades(priceMap: Map<string, number>, now: Date) {
  const pending = await db
    .select()
    .from(trades)
    .where(eq(trades.status, "pending" as any));

  if (!pending.length) return;

  console.log(`🔍 trade-engine: pendientes=${pending.length}`);

  for (const t of pending) {
    try {
      const symbol = String(t.symbol).toUpperCase();
      const price = priceMap.get(symbol);
      if (!price || !Number.isFinite(price)) continue;

      // expiración
      if (t.expiresAt && new Date(t.expiresAt) < now) {
        console.log(`⏰ Pendiente expirada ${t.id} (${symbol})`);
        // Podrías llamar a /api/trade/pending/cancel, pero como solo marca 0
        // y no toca balances, tampoco pasa nada si la dejas como está.
        continue;
      }

      const market = marketOfSymbol(symbol);
      if (!isMarketOpenForMarket(market, now)) {
        continue;
      }

      const trigger = Number(t.triggerPrice ?? 0);
      const rule = String(t.triggerRule ?? "");

      if (!trigger || !rule) continue;

      const gteOk = rule === "gte" && price >= trigger;
      const lteOk = rule === "lte" && price <= trigger;

      if (!gteOk && !lteOk) continue;

      // Condición cumplida → activar vía endpoint existente
      console.log(
        `✅ Activando pendiente ${t.id} (${symbol}) @${price} (rule=${rule}, trigger=${trigger})`
      );

      const res = await fetch(ACTIVATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradeId: t.id,
          currentPrice: price,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error(
          `❌ Error activando pendiente ${t.id}:`,
          res.status,
          txt.slice(0, 200)
        );
      }
    } catch (err) {
      console.error("❌ Error procesando pendiente", t.id, err);
    }
  }
}

/* ========= Lógica: procesar abiertos (TP/SL) ========= */

async function processOpenTrades(priceMap: Map<string, number>, now: Date) {
  const open = await db
    .select()
    .from(trades)
    .where(eq(trades.status, "open" as any));

  if (!open.length) return;

  console.log(`🔍 trade-engine: abiertos=${open.length}`);

  for (const t of open) {
    try {
      const symbol = String(t.symbol).toUpperCase();
      const price = priceMap.get(symbol);
      if (!price || !Number.isFinite(price)) continue;

      const market = marketOfSymbol(symbol);
      if (!isMarketOpenForMarket(market, now)) {
        continue;
      }

      const side = t.side === "sell" ? "sell" : "buy";
      const tp = t.takeProfit ? Number(t.takeProfit) : null;
      const sl = t.stopLoss ? Number(t.stopLoss) : null;

      let shouldClose = false;
      let reason: "tp" | "sl" | null = null;

      // 1) Primero Stop Loss (prioridad a proteger)
      if (sl && Number.isFinite(sl)) {
        if (
          (side === "buy" && price <= sl) ||
          (side === "sell" && price >= sl)
        ) {
          shouldClose = true;
          reason = "sl";
        }
      }

      // 2) Luego Take Profit (solo si no se activó SL)
      if (!shouldClose && tp && Number.isFinite(tp)) {
        if (
          (side === "buy" && price >= tp) ||
          (side === "sell" && price <= tp)
        ) {
          shouldClose = true;
          reason = "tp";
        }
      }

      if (!shouldClose) continue;

      console.log(
        `✅ Cerrando trade ${t.id} (${symbol}) por ${
          reason === "sl" ? "STOP LOSS" : "TAKE PROFIT"
        } @${price}`
      );

      const res = await fetch(CLOSE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradeId: t.id,
          closePrice: price,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error(
          `❌ Error cerrando trade ${t.id}:`,
          res.status,
          txt.slice(0, 200)
        );
      }
    } catch (err) {
      console.error("❌ Error procesando abierto", t.id, err);
    }
  }
}

/* ========= Bucle principal ========= */

async function engineLoop() {
  console.log("🚀 trade-engine iniciado. Intervalo:", ENGINE_INTERVAL_MS, "ms");
  if (!ENGINE_ENABLED) {
    console.log("⚠️ TRADE_ENGINE_ENABLED=false → motor deshabilitado.");
    return;
  }

  // Loop infinito controlado por intervalo
  while (true) {
    const started = Date.now();
    const now = new Date();

    try {
      const prices = await fetchPrices();
      if (prices.size === 0) {
        console.warn("⚠️ trade-engine: sin precios, se salta ciclo.");
      } else {
        await processPendingTrades(prices, now);
        await processOpenTrades(prices, now);
      }
    } catch (err) {
      console.error("❌ trade-engine ciclo con error:", err);
    }

    const elapsed = Date.now() - started;
    const wait = Math.max(500, ENGINE_INTERVAL_MS - elapsed);
    await sleep(wait);
  }
}

// Solo arrancar si se ejecuta directamente (por si en algún momento lo importas).
if (require.main === module) {
  engineLoop().catch((err) => {
    console.error("❌ trade-engine fallo fatal:", err);
    process.exit(1);
  });
}
