// /app/api/trade/open/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { trades, user, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const {
      userId,
      symbol,
      side,
      entryPrice,
      quantity,
      leverage = 1,
      takeProfit = null,
      stopLoss = null,
    } = await req.json();

    if (!userId || !symbol || !side || !entryPrice || !quantity) {
      return NextResponse.json(
        { success: false, error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    // Obtener usuario
    const [userData] = await db.select().from(user).where(eq(user.id, userId));
    if (!userData)
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );

    // Calcular margen
    const price = Number(entryPrice);
    const qty = Number(quantity);
    const lev = Number(leverage);
    const marginUsed = (price * qty) / lev;

    if (Number(userData.balance ?? 0) < marginUsed) {
      return NextResponse.json(
        { success: false, error: "Saldo insuficiente" },
        { status: 400 }
      );
    }

    // Crear operación mercado
    const [newTrade] = await db
      .insert(trades)
      .values({
        id: crypto.randomUUID(),
        userId,
        symbol,
        side,
        orderType: "market",
        entryPrice,
        closePrice: null,
        quantity,
        leverage,
        status: "open",

        // Nuevo 🟢
        takeProfit,
        stopLoss,

        metadata: { marginUsed },
      })
      .returning();

    // Actualizar balance
    const newBalance = Number(userData.balance) - marginUsed;

    await db
      .update(user)
      .set({ balance: newBalance.toFixed(2) })
      .where(eq(user.id, userId));

    // Registrar transacción AUDITORÍA
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId,
      type: "trade",
      amount: (-marginUsed).toFixed(2),
      status: "completed",
      currency: "USD",
      metadata: {
        tradeId: newTrade.id,
        symbol,
        side,
        entryPrice,
        quantity,
        leverage,
        marginUsed,
        takeProfit,
        stopLoss,
      },
    });

    return NextResponse.json({
      success: true,
      trade: {
        ...newTrade,
        marginUsed: marginUsed.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
      },
    });
  } catch (error) {
    console.error("❌ Error abriendo operación:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
