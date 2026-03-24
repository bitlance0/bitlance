// /app/api/trade/pending/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { trades, user, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isSymbolMarketOpen } from "@/lib/marketSessions";

export async function POST(req: Request) {
  try {
    const {
      userId,
      symbol,
      side,
      quantity,
      leverage = 1,
      triggerPrice,
      triggerRule,
      expiresAt,

      // Nuevo 🟢
      takeProfit = null,
      stopLoss = null,
    } = await req.json();

    if (!userId || !symbol || !side || !quantity || !triggerPrice || !triggerRule) {
      return NextResponse.json(
        { success: false, error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    if (!["buy", "sell"].includes(side)) {
      return NextResponse.json({ success: false, error: "Side inválido" }, { status: 400 });
    }

    if (!["gte", "lte"].includes(triggerRule)) {
      return NextResponse.json({ success: false, error: "TriggerRule inválido" }, { status: 400 });
    }

    const marketStatus = isSymbolMarketOpen(String(symbol));
    if (!marketStatus.open) {
      return NextResponse.json(
        {
          success: false,
          error: `Mercado cerrado para ${String(symbol).toUpperCase()}. No se puede crear la orden ahora.`,
          market: marketStatus.market,
        },
        { status: 400 }
      );
    }

    // Validar usuario
    const [u] = await db.select().from(user).where(eq(user.id, String(userId)));
    if (!u) return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });

    // Insertar orden pendiente (sin descontar margen todavía)
    const [pendingTrade] = await db
      .insert(trades)
      .values({
        id: crypto.randomUUID(),
        userId,
        symbol,
        side,
        orderType: "pending",
        quantity,
        leverage,
        status: "pending",

        triggerPrice,
        triggerRule,
        expiresAt: expiresAt ? new Date(expiresAt) : null,

        // Nuevo 🟢
        takeProfit,
        stopLoss,

        metadata: { createdFrom: "pending-ui" },
      })
      .returning();

    // Registrar auditoría
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId,
      type: "trade",
      amount: "0.00",
      status: "pending",
      currency: "USD",
      metadata: {
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
    console.error("❌ Error creando pendiente:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
