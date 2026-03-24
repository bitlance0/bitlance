// src/lib/tradeEngineRunner.ts
import { db } from "@/db";
import { trades } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isSymbolMarketOpen } from "@/lib/marketSessions";

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const MARKET_URL = `${APP_BASE_URL}/api/markets?market=all`;
const ACTIVATE_URL = `${APP_BASE_URL}/api/trade/pending/activate`;
const CLOSE_URL = `${APP_BASE_URL}/api/trade/close`;

async function fetchPrices() {
  const res = await fetch(MARKET_URL);
  if (!res.ok) return new Map();
  const data = await res.json();
  const map = new Map<string, number>();
  for (const q of data) {
    if (q?.symbol && typeof q.price === "number") {
      map.set(q.symbol.toUpperCase(), q.price);
    }
  }
  return map;
}

async function processPendingTrades(priceMap: Map<string, number>, now: Date) {
  const pending = await db
    .select()
    .from(trades)
    .where(eq(trades.status, "pending" as any));

  for (const t of pending) {
    try {
      const symbol = String(t.symbol).toUpperCase();
      const price = priceMap.get(symbol);
      if (!price) continue;

      if (t.expiresAt && new Date(t.expiresAt) < now) continue;

      const marketStatus = isSymbolMarketOpen(symbol, now);
      if (!marketStatus.open) continue;

      const trigger = Number(t.triggerPrice ?? 0);
      const rule = String(t.triggerRule ?? "");
      if (!trigger || !rule) continue;

      const gteOk = rule === "gte" && price >= trigger;
      const lteOk = rule === "lte" && price <= trigger;
      if (!gteOk && !lteOk) continue;

      await fetch(ACTIVATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId: t.id, currentPrice: price }),
      });
    } catch (err) {
      console.error("Error procesando pendiente:", t.id, err);
    }
  }
}

async function processOpenTrades(priceMap: Map<string, number>, now: Date) {
  const open = await db
    .select()
    .from(trades)
    .where(eq(trades.status, "open" as any));

  for (const t of open) {
    try {
      const symbol = String(t.symbol).toUpperCase();
      const price = priceMap.get(symbol);
      if (!price) continue;

      const marketStatus = isSymbolMarketOpen(symbol, now);
      if (!marketStatus.open) continue;

      const side = t.side === "sell" ? "sell" : "buy";
      const tp = t.takeProfit ? Number(t.takeProfit) : null;
      const sl = t.stopLoss ? Number(t.stopLoss) : null;

      let shouldClose = false;

      if (sl && Number.isFinite(sl)) {
        if ((side === "buy" && price <= sl) || (side === "sell" && price >= sl)) {
          shouldClose = true;
        }
      }

      if (!shouldClose && tp && Number.isFinite(tp)) {
        if ((side === "buy" && price >= tp) || (side === "sell" && price <= tp)) {
          shouldClose = true;
        }
      }

      if (!shouldClose) continue;

      await fetch(CLOSE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId: t.id, closePrice: price }),
      });
    } catch (err) {
      console.error("Error procesando abierto:", t.id, err);
    }
  }
}

export async function runTradeEngineOnce() {
  const now = new Date();
  const prices = await fetchPrices();
  if (!prices.size) return { ok: false, message: "Sin precios" };

  await processPendingTrades(prices, now);
  await processOpenTrades(prices, now);

  return { ok: true };
}
