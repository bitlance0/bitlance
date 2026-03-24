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

function normalizeSymbol(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function parseSide(value: unknown): "buy" | "sell" | null {
  const side = String(value ?? "").trim().toLowerCase();
  if (side === "buy" || side === "sell") return side;
  return null;
}

function toPositiveNumber(value: unknown, fieldName: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Campo invalido: ${fieldName}`);
  }
  return n;
}

function toOptionalPositiveNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Campo invalido: takeProfit/stopLoss");
  }
  return n;
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
    const actor = await getActor(req);
    if (!actor?.user?.id) {
      return NextResponse.json(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const userId = actor.user.id;
    const symbol = normalizeSymbol(body?.symbol);
    const side = parseSide(body?.side);

    if (!symbol || !side) {
      return NextResponse.json(
        { success: false, error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    const quantity = toPositiveNumber(body?.quantity, "quantity");
    const leverage = toPositiveNumber(body?.leverage ?? 1, "leverage");
    const takeProfit = toOptionalPositiveNumber(body?.takeProfit);
    const stopLoss = toOptionalPositiveNumber(body?.stopLoss);

    const marketStatus = isSymbolMarketOpen(symbol);
    if (!marketStatus.open) {
      return NextResponse.json(
        {
          success: false,
          error: `Mercado cerrado para ${symbol}. Intenta durante horario habil.`,
          market: marketStatus.market,
        },
        { status: 400 }
      );
    }

    const quoteContext: ItickQuoteContext = {
      market: body?.market,
      exchange: body?.exchange,
      scope: body?.scope,
    };
    const quote = await fetchItickLatestQuote(symbol, quoteContext);
    const entryPrice = quote.price;

    if (takeProfit !== null) {
      if ((side === "buy" && takeProfit <= entryPrice) || (side === "sell" && takeProfit >= entryPrice)) {
        return NextResponse.json(
          {
            success: false,
            error: "Take Profit invalido para la direccion de la operacion",
          },
          { status: 400 }
        );
      }
    }

    if (stopLoss !== null) {
      if ((side === "buy" && stopLoss >= entryPrice) || (side === "sell" && stopLoss <= entryPrice)) {
        return NextResponse.json(
          {
            success: false,
            error: "Stop Loss invalido para la direccion de la operacion",
          },
          { status: 400 }
        );
      }
    }

    const marginUsed = Number(((entryPrice * quantity) / leverage).toFixed(2));
    if (!Number.isFinite(marginUsed) || marginUsed <= 0) {
      return NextResponse.json(
        { success: false, error: "No se pudo calcular el margen de la operacion" },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [debited] = await tx
        .update(user)
        .set({
          balance: sql`(${user.balance}::numeric - ${marginUsed})::numeric`,
        })
        .where(and(eq(user.id, userId), gte(user.balance, String(marginUsed))))
        .returning({
          balance: user.balance,
        });

      if (!debited) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const [newTrade] = await tx
        .insert(trades)
        .values({
          id: crypto.randomUUID(),
          userId,
          symbol,
          side,
          orderType: "market",
          entryPrice: entryPrice.toFixed(4),
          closePrice: null,
          quantity: quantity.toFixed(4),
          leverage: leverage.toFixed(2),
          status: "open",
          takeProfit: takeProfit !== null ? takeProfit.toFixed(4) : null,
          stopLoss: stopLoss !== null ? stopLoss.toFixed(4) : null,
          metadata: {
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
        .returning();

      await tx.insert(transactions).values({
        id: crypto.randomUUID(),
        userId,
        type: "trade",
        amount: (-marginUsed).toFixed(2),
        status: "completed",
        currency: "USD",
        metadata: {
          kind: "trade_open",
          tradeId: newTrade.id,
          symbol,
          side,
          entryPrice: entryPrice.toFixed(4),
          quantity,
          leverage,
          marginUsed,
          takeProfit,
          stopLoss,
        },
      });

      return {
        trade: newTrade,
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
        { success: false, error: "Saldo insuficiente" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.startsWith("Campo invalido:")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.error("Error abriendo operacion:", error);
    return NextResponse.json(
      { success: false, error: "Error interno abriendo operacion" },
      { status: 500 }
    );
  }
}

