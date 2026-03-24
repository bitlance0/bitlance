import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { trades, user, transactions } from "@/db/schema";
import { getActor } from "@/modules/auth/services/getActor";
import { isSymbolMarketOpen } from "@/lib/marketSessions";
import {
  fetchItickLatestQuote,
  ItickQuoteError,
  type ItickQuoteContext,
} from "@/lib/itick/quoteServer";

function isInternalTradeEngineRequest(req: Request) {
  const internalKey = process.env.TRADE_ENGINE_INTERNAL_KEY?.trim();
  const headerKey = req.headers.get("x-trade-engine-key");
  if (internalKey) return headerKey === internalKey;
  if (process.env.NODE_ENV !== "production") return headerKey === "dev-local";
  return false;
}

function parseTradeMetadata(metadata: unknown): Record<string, unknown> {
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

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolveQuoteError(error: unknown) {
  if (error instanceof ItickQuoteError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        detail: error.detail,
      },
      { status: error.status }
    );
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const internalRequest = isInternalTradeEngineRequest(req);
    const actor = internalRequest ? null : await getActor(req);

    if (!internalRequest && !actor?.user?.id) {
      return NextResponse.json(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const tradeId = String(body?.tradeId ?? "").trim();
    if (!tradeId) {
      return NextResponse.json(
        { success: false, error: "Falta tradeId" },
        { status: 400 }
      );
    }

    const [trade] = await db.select().from(trades).where(eq(trades.id, tradeId));
    if (!trade) {
      return NextResponse.json(
        { success: false, error: "Trade no encontrado" },
        { status: 404 }
      );
    }

    if (!internalRequest && actor?.user?.id !== trade.userId) {
      return NextResponse.json(
        { success: false, error: "No autorizado para activar este trade" },
        { status: 403 }
      );
    }

    if (trade.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "El trade no esta en estado pending" },
        { status: 400 }
      );
    }

    if (trade.expiresAt && new Date(trade.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: "La orden pendiente ya expiro" },
        { status: 400 }
      );
    }

    const marketStatus = isSymbolMarketOpen(String(trade.symbol));
    if (!marketStatus.open) {
      return NextResponse.json(
        {
          success: false,
          error: `Mercado cerrado para ${String(trade.symbol).toUpperCase()}. No se puede activar la orden.`,
          market: marketStatus.market,
        },
        { status: 400 }
      );
    }

    const trigger = toNumber(trade.triggerPrice);
    const rule = String(trade.triggerRule ?? "").toLowerCase();
    if (!trigger || !(rule === "gte" || rule === "lte")) {
      return NextResponse.json(
        { success: false, error: "Trade pending invalido (trigger/rule)" },
        { status: 400 }
      );
    }

    const metadata = parseTradeMetadata(trade.metadata);
    const quoteContextRaw =
      typeof metadata.quoteContext === "object" && metadata.quoteContext !== null
        ? (metadata.quoteContext as Record<string, unknown>)
        : {};
    const quoteContext: ItickQuoteContext = {
      market: String(quoteContextRaw.market ?? ""),
      exchange: String(quoteContextRaw.exchange ?? ""),
      scope: String(quoteContextRaw.scope ?? ""),
    };

    const quote = await fetchItickLatestQuote(String(trade.symbol), quoteContext);
    const nowPrice = quote.price;

    if (rule === "gte" && nowPrice < trigger) {
      return NextResponse.json(
        { success: false, error: "Condicion gte no cumplida" },
        { status: 400 }
      );
    }
    if (rule === "lte" && nowPrice > trigger) {
      return NextResponse.json(
        { success: false, error: "Condicion lte no cumplida" },
        { status: 400 }
      );
    }

    const quantity = Number(trade.quantity ?? 0);
    const leverage = Number(trade.leverage ?? 1);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(leverage) || leverage <= 0) {
      return NextResponse.json(
        { success: false, error: "Trade con cantidad/apalancamiento invalido" },
        { status: 400 }
      );
    }

    const marginUsed = Number(((nowPrice * quantity) / leverage).toFixed(2));
    if (!Number.isFinite(marginUsed) || marginUsed <= 0) {
      return NextResponse.json(
        { success: false, error: "No se pudo calcular margen de activacion" },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [debited] = await tx
        .update(user)
        .set({
          balance: sql`(${user.balance}::numeric - ${marginUsed})::numeric`,
        })
        .where(and(eq(user.id, trade.userId), gte(user.balance, String(marginUsed))))
        .returning({
          balance: user.balance,
        });

      if (!debited) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const [opened] = await tx
        .update(trades)
        .set({
          entryPrice: nowPrice.toFixed(4),
          status: "open",
          orderType: "market",
          metadata: {
            ...metadata,
            activatedAt: new Date().toISOString(),
            activatedFrom: "pending",
            marginUsed,
            quoteSource: "itick",
            quoteContext: {
              market: quote.market,
              exchange: quote.exchange,
              region: quote.region,
              apiType: quote.apiType,
            },
            quoteTimestamp: quote.latestTradingDay || null,
          },
        })
        .where(and(eq(trades.id, trade.id), eq(trades.status, "pending")))
        .returning();

      if (!opened) {
        throw new Error("TRADE_ALREADY_PROCESSED");
      }

      await tx.insert(transactions).values({
        id: crypto.randomUUID(),
        userId: trade.userId,
        type: "trade",
        amount: (-marginUsed).toFixed(2),
        status: "completed",
        currency: "USD",
        metadata: {
          kind: "trade_pending_activate",
          tradeId: trade.id,
          transitioned: "pending_to_open",
          entryPrice: nowPrice.toFixed(4),
          symbol: trade.symbol,
          side: trade.side,
          quantity,
          leverage,
          marginUsed,
          takeProfit: trade.takeProfit ?? null,
          stopLoss: trade.stopLoss ?? null,
        },
      });

      return {
        trade: opened,
        balanceAfter: Number(debited.balance),
      };
    });

    return NextResponse.json({
      success: true,
      trade: {
        ...result.trade,
        marginUsed: marginUsed.toFixed(2),
        balanceAfter: Number(result.balanceAfter.toFixed(2)),
      },
    });
  } catch (error) {
    const quoteErrorResponse = resolveQuoteError(error);
    if (quoteErrorResponse) return quoteErrorResponse;

    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        { success: false, error: "Saldo insuficiente para activar la operacion" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "TRADE_ALREADY_PROCESSED") {
      return NextResponse.json(
        { success: false, error: "La orden pendiente ya fue procesada" },
        { status: 409 }
      );
    }

    console.error("Error activando pendiente:", error);
    return NextResponse.json(
      { success: false, error: "Error interno activando pendiente" },
      { status: 500 }
    );
  }
}
