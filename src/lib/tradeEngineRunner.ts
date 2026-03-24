import { db } from "@/db";
import { trades } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isSymbolMarketOpen } from "@/lib/marketSessions";
import {
  fetchItickLatestQuote,
  ItickQuoteError,
  type ItickQuoteContext,
} from "@/lib/itick/quoteServer";

const APP_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const ACTIVATE_URL = `${APP_BASE_URL}/api/trade/pending/activate`;
const CLOSE_URL = `${APP_BASE_URL}/api/trade/close`;
const TRADE_ENGINE_INTERNAL_KEY = process.env.TRADE_ENGINE_INTERNAL_KEY?.trim();

function parseMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata) return {};
  if (typeof metadata === "object") return metadata as Record<string, unknown>;
  if (typeof metadata !== "string") return {};
  try {
    const parsed = JSON.parse(metadata) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function getTradeQuoteContext(metadata: unknown): ItickQuoteContext {
  const parsed = parseMetadata(metadata);
  const raw =
    typeof parsed.quoteContext === "object" && parsed.quoteContext !== null
      ? (parsed.quoteContext as Record<string, unknown>)
      : {};

  return {
    market: String(raw.market ?? ""),
    exchange: String(raw.exchange ?? ""),
    scope: String(raw.scope ?? ""),
  };
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildInternalHeaders() {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (TRADE_ENGINE_INTERNAL_KEY) {
    headers["x-trade-engine-key"] = TRADE_ENGINE_INTERNAL_KEY;
  } else if (process.env.NODE_ENV !== "production") {
    headers["x-trade-engine-key"] = "dev-local";
  }
  return headers;
}

async function resolvePriceForTrade(trade: typeof trades.$inferSelect) {
  const context = getTradeQuoteContext(trade.metadata);
  const quote = await fetchItickLatestQuote(String(trade.symbol), context);
  return quote.price;
}

async function processPendingTrades(now: Date) {
  const pending = await db
    .select()
    .from(trades)
    .where(eq(trades.status, "pending" as "pending"));

  for (const trade of pending) {
    try {
      const symbol = String(trade.symbol).toUpperCase();

      if (trade.expiresAt && new Date(trade.expiresAt) < now) {
        continue;
      }

      const marketStatus = isSymbolMarketOpen(symbol, now);
      if (!marketStatus.open) continue;

      const trigger = toNumber(trade.triggerPrice);
      const rule = String(trade.triggerRule ?? "").toLowerCase();
      if (!trigger || !(rule === "gte" || rule === "lte")) continue;

      const price = await resolvePriceForTrade(trade);
      const gteOk = rule === "gte" && price >= trigger;
      const lteOk = rule === "lte" && price <= trigger;
      if (!gteOk && !lteOk) continue;

      const response = await fetch(ACTIVATE_URL, {
        method: "POST",
        headers: buildInternalHeaders(),
        body: JSON.stringify({ tradeId: trade.id }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.warn(
          `[trade-engine] No se pudo activar trade ${trade.id}: ${response.status} ${detail}`
        );
      }
    } catch (error) {
      if (error instanceof ItickQuoteError && error.code === "rate_limited") {
        console.warn("[trade-engine] iTICK rate limited while activating pending");
        return;
      }
      console.error("[trade-engine] Error procesando pendiente:", trade.id, error);
    }
  }
}

async function processOpenTrades(now: Date) {
  const open = await db
    .select()
    .from(trades)
    .where(eq(trades.status, "open" as "open"));

  for (const trade of open) {
    try {
      const symbol = String(trade.symbol).toUpperCase();
      const marketStatus = isSymbolMarketOpen(symbol, now);
      if (!marketStatus.open) continue;

      const price = await resolvePriceForTrade(trade);
      const side = trade.side === "sell" ? "sell" : "buy";
      const tp = toNumber(trade.takeProfit);
      const sl = toNumber(trade.stopLoss);

      let shouldClose = false;
      if (sl !== null) {
        if ((side === "buy" && price <= sl) || (side === "sell" && price >= sl)) {
          shouldClose = true;
        }
      }

      if (!shouldClose && tp !== null) {
        if ((side === "buy" && price >= tp) || (side === "sell" && price <= tp)) {
          shouldClose = true;
        }
      }

      if (!shouldClose) continue;

      const response = await fetch(CLOSE_URL, {
        method: "POST",
        headers: buildInternalHeaders(),
        body: JSON.stringify({ tradeId: trade.id }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.warn(
          `[trade-engine] No se pudo cerrar trade ${trade.id}: ${response.status} ${detail}`
        );
      }
    } catch (error) {
      if (error instanceof ItickQuoteError && error.code === "rate_limited") {
        console.warn("[trade-engine] iTICK rate limited while closing trades");
        return;
      }
      console.error("[trade-engine] Error procesando abierto:", trade.id, error);
    }
  }
}

export async function runTradeEngineOnce() {
  const now = new Date();

  await processPendingTrades(now);
  await processOpenTrades(now);

  return { ok: true };
}
