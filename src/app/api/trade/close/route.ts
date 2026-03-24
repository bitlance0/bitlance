import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { trades, transactions, user } from "@/db/schema";
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
        { success: false, error: "No autorizado para cerrar este trade" },
        { status: 403 }
      );
    }

    if (trade.status !== "open") {
      return NextResponse.json(
        { success: false, error: "La operacion no esta abierta" },
        { status: 400 }
      );
    }

    const marketStatus = isSymbolMarketOpen(String(trade.symbol));
    if (!marketStatus.open) {
      return NextResponse.json(
        {
          success: false,
          error: `Mercado cerrado para ${String(trade.symbol).toUpperCase()}. No se puede cerrar manualmente ahora.`,
          market: marketStatus.market,
        },
        { status: 400 }
      );
    }

    const entry = Number(trade.entryPrice ?? 0);
    const quantity = Number(trade.quantity ?? 0);
    const leverage = Number(trade.leverage ?? 1);
    if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: "Trade con entry/quantity invalido" },
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
    const close = quote.price;
    const sideFactor = trade.side === "buy" ? 1 : -1;

    const profit = Number(((close - entry) * quantity * leverage * sideFactor).toFixed(2));
    const marginFromMetadata = Number(metadata.marginUsed ?? 0);
    const marginUsed = Number.isFinite(marginFromMetadata) && marginFromMetadata > 0
      ? marginFromMetadata
      : Number(((entry * quantity) / leverage).toFixed(2));
    const cashDelta = Number((marginUsed + profit).toFixed(2));

    const closedAt = new Date();

    const result = await db.transaction(async (tx) => {
      const [closedTrade] = await tx
        .update(trades)
        .set({
          closePrice: close.toFixed(4),
          profit: profit.toFixed(2),
          status: "closed",
          closedAt,
          metadata: {
            ...metadata,
            closedBy: internalRequest ? "engine" : "manual",
            closedReason: internalRequest ? "engine_signal" : "user_close",
            quoteSource: "itick",
            closeQuoteContext: {
              market: quote.market,
              exchange: quote.exchange,
              region: quote.region,
              apiType: quote.apiType,
            },
            closeQuoteTimestamp: quote.latestTradingDay || null,
          },
        })
        .where(and(eq(trades.id, trade.id), eq(trades.status, "open")))
        .returning();

      if (!closedTrade) {
        throw new Error("TRADE_ALREADY_CLOSED");
      }

      const [updatedUser] = await tx
        .update(user)
        .set({
          balance: sql`(${user.balance}::numeric + ${cashDelta})::numeric`,
        })
        .where(eq(user.id, trade.userId))
        .returning({
          balance: user.balance,
        });

      if (!updatedUser) {
        throw new Error("USER_NOT_FOUND");
      }

      await tx.insert(transactions).values({
        id: crypto.randomUUID(),
        userId: trade.userId,
        type: "trade",
        amount: cashDelta.toFixed(2),
        status: "completed",
        currency: "USD",
        metadata: {
          kind: "trade_close",
          tradeId: trade.id,
          symbol: trade.symbol,
          side: trade.side,
          entryPrice: entry.toFixed(4),
          closePrice: close.toFixed(4),
          quantity,
          leverage,
          profit,
          marginUsed,
          cashDelta,
        },
      });

      return {
        trade: closedTrade,
        balanceAfter: Number(updatedUser.balance),
      };
    });

    return NextResponse.json({
      success: true,
      trade: {
        ...result.trade,
        entryPrice: entry.toFixed(4),
        closePrice: close,
        quantity,
        leverage,
        profit,
        closedAt: closedAt.toISOString(),
        newBalance: Number(result.balanceAfter.toFixed(2)),
      },
      newBalance: Number(result.balanceAfter.toFixed(2)),
    });
  } catch (error) {
    const quoteErrorResponse = resolveQuoteError(error);
    if (quoteErrorResponse) return quoteErrorResponse;

    if (error instanceof Error && error.message === "TRADE_ALREADY_CLOSED") {
      return NextResponse.json(
        { success: false, error: "La operacion ya fue cerrada" },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "Usuario asociado al trade no encontrado" },
        { status: 404 }
      );
    }

    console.error("Error cerrando trade:", error);
    return NextResponse.json(
      { success: false, error: "Error interno cerrando operacion" },
      { status: 500 }
    );
  }
}
