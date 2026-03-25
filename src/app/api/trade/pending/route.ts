import { NextResponse } from "next/server";
import { db } from "@/db";
import { trades, transactions } from "@/db/schema";
import { getActor } from "@/modules/auth/services/getActor";
import { isSymbolMarketOpen } from "@/lib/marketSessions";

function normalizeSymbol(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function parseSide(value: unknown): "buy" | "sell" | null {
  const side = String(value ?? "").trim().toLowerCase();
  if (side === "buy" || side === "sell") return side;
  return null;
}

function parseTriggerRule(value: unknown): "gte" | "lte" | null {
  const rule = String(value ?? "").trim().toLowerCase();
  if (rule === "gte" || rule === "lte") return rule;
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
    const triggerRule = parseTriggerRule(body?.triggerRule);

    if (!symbol || !side || !triggerRule) {
      return NextResponse.json(
        { success: false, error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    const quantity = toPositiveNumber(body?.quantity, "quantity");
    const leverage = toPositiveNumber(body?.leverage ?? 1, "leverage");
    const triggerPrice = toPositiveNumber(body?.triggerPrice, "triggerPrice");
    const takeProfit = toOptionalPositiveNumber(body?.takeProfit);
    const stopLoss = toOptionalPositiveNumber(body?.stopLoss);

    if (takeProfit !== null) {
      if ((side === "buy" && takeProfit <= triggerPrice) || (side === "sell" && takeProfit >= triggerPrice)) {
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
      if ((side === "buy" && stopLoss >= triggerPrice) || (side === "sell" && stopLoss <= triggerPrice)) {
        return NextResponse.json(
          {
            success: false,
            error: "Stop Loss invalido para la direccion de la operacion",
          },
          { status: 400 }
        );
      }
    }

    const marketStatus = isSymbolMarketOpen(symbol);
    if (!marketStatus.open) {
      return NextResponse.json(
        {
          success: false,
          error: `Mercado cerrado para ${symbol}. No se puede crear la orden ahora.`,
          market: marketStatus.market,
        },
        { status: 400 }
      );
    }

    const [pendingTrade] = await db
      .insert(trades)
      .values({
        id: crypto.randomUUID(),
        userId,
        symbol,
        side,
        orderType: "pending",
        quantity: quantity.toFixed(4),
        leverage: leverage.toFixed(2),
        status: "pending",
        triggerPrice: triggerPrice.toFixed(4),
        triggerRule,
        expiresAt: body?.expiresAt ? new Date(body.expiresAt) : null,
        takeProfit: takeProfit !== null ? takeProfit.toFixed(4) : null,
        stopLoss: stopLoss !== null ? stopLoss.toFixed(4) : null,
        metadata: {
          createdFrom: "pending-ui",
          quoteContext: {
            market: body?.market ?? null,
            exchange: body?.exchange ?? null,
            scope: body?.scope ?? null,
          },
        },
      })
      .returning();

    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId,
      type: "trade",
      amount: "0.00",
      status: "pending",
      currency: "USD",
      metadata: {
        kind: "trade_pending_open",
        pendingTradeId: pendingTrade.id,
        symbol,
        side,
        quantity,
        leverage,
        triggerPrice,
        triggerRule,
        takeProfit,
        stopLoss,
      },
    });

    return NextResponse.json({ success: true, trade: pendingTrade });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Campo invalido:")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.error("Error creando pendiente:", error);
    return NextResponse.json(
      { success: false, error: "Error interno creando orden pendiente" },
      { status: 500 }
    );
  }
}

