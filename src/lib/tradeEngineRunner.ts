import { db } from "@/db";
import { trades } from "@/db/schema";
import { and, eq } from "drizzle-orm";
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

type TradeEngineBatchResult = {
  scanned: number;
  activated: number;
  closed: number;
};

export type TradeEngineRunResult = {
  ok: true;
  pending: {
    scanned: number;
    activated: number;
  };
  open: {
    scanned: number;
    closed: number;
  };
};

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

function toPositiveNumber(value: unknown) {
  const n = toNumber(value);
  return n !== null && n > 0 ? n : null;
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

async function processPendingTrades(now: Date, userId?: string): Promise<TradeEngineBatchResult> {
  const pending = await db
    .select()
    .from(trades)
    .where(
      userId
        ? and(eq(trades.status, "pending" as "pending"), eq(trades.userId, userId))
        : eq(trades.status, "pending" as "pending")
    );

  let activated = 0;

  for (const trade of pending) {
    try {
      const symbol = String(trade.symbol).toUpperCase();

      if (trade.expiresAt && new Date(trade.expiresAt) < now) {
        continue;
      }

      const marketStatus = isSymbolMarketOpen(symbol, now);
      if (!marketStatus.open) continue;

      const trigger = toPositiveNumber(trade.triggerPrice);
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
        continue;
      }
      activated += 1;
    } catch (error) {
      if (error instanceof ItickQuoteError && error.code === "rate_limited") {
        console.warn("[trade-engine] iTICK rate limited while activating pending");
        break;
      }
      console.error("[trade-engine] Error procesando pendiente:", trade.id, error);
    }
  }

  return {
    scanned: pending.length,
    activated,
    closed: 0,
  };
}

async function processOpenTrades(now: Date, userId?: string): Promise<TradeEngineBatchResult> {
  const open = await db
    .select()
    .from(trades)
    .where(
      userId
        ? and(eq(trades.status, "open" as "open"), eq(trades.userId, userId))
        : eq(trades.status, "open" as "open")
    );

  let closed = 0;

  for (const trade of open) {
    try {
      const symbol = String(trade.symbol).toUpperCase();
      const marketStatus = isSymbolMarketOpen(symbol, now);
      if (!marketStatus.open) continue;

      const side = trade.side === "sell" ? "sell" : "buy";
      const tp = toPositiveNumber(trade.takeProfit);
      const sl = toPositiveNumber(trade.stopLoss);

      if (tp === null && sl === null) {
        continue;
      }

      const price = await resolvePriceForTrade(trade);

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
        continue;
      }
      closed += 1;
    } catch (error) {
      if (error instanceof ItickQuoteError && error.code === "rate_limited") {
        console.warn("[trade-engine] iTICK rate limited while closing trades");
        break;
      }
      console.error("[trade-engine] Error procesando abierto:", trade.id, error);
    }
  }

  return {
    scanned: open.length,
    activated: 0,
    closed,
  };
}

export async function runTradeEngineOnce(options?: { userId?: string }): Promise<TradeEngineRunResult> {
  const now = new Date();
  const userId = options?.userId;

  const pending = await processPendingTrades(now, userId);
  const open = await processOpenTrades(now, userId);

  return {
    ok: true,
    pending: {
      scanned: pending.scanned,
      activated: pending.activated,
    },
    open: {
      scanned: open.scanned,
      closed: open.closed,
    },
  };
}
