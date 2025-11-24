// src/app/api/trade/pending/cancel/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { trades, user, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { tradeId, currentPrice } = await req.json();

    if (!tradeId || !currentPrice) {
      return NextResponse.json(
        { success: false, error: "Faltan tradeId o currentPrice" },
        { status: 400 }
      );
    }

    const [t] = await db.select().from(trades).where(eq(trades.id, String(tradeId)));

    if (!t)
      return NextResponse.json({ success: false, error: "Trade no encontrado" }, { status: 404 });

    if (t.status !== "pending")
      return NextResponse.json(
        { success: false, error: "El trade no está en estado pending" },
        { status: 400 }
      );

    const trigger = Number(t.triggerPrice ?? 0);
    const rule = String(t.triggerRule ?? "");
    const nowPrice = Number(currentPrice);

    // Validación de reglas
    if (rule === "gte" && nowPrice < trigger) {
      return NextResponse.json({ success: false, error: "Condición gte no cumplida" }, { status: 400 });
    }
    if (rule === "lte" && nowPrice > trigger) {
      return NextResponse.json({ success: false, error: "Condición lte no cumplida" }, { status: 400 });
    }

    // Usuario
    const [u] = await db.select().from(user).where(eq(user.id, t.userId));
    if (!u) return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });

    const qty = Number(t.quantity ?? 0);
    const lev = Number(t.leverage ?? 1);

    const marginUsed = (nowPrice * qty) / lev;
    const balanceNum = Number(u.balance ?? 0);

    if (balanceNum < marginUsed) {
      return NextResponse.json(
        { success: false, error: "Saldo insuficiente para activar la operación" },
        { status: 400 }
      );
    }

    // Parse metadata previa
    const mdPrev =
      typeof t.metadata === "string"
        ? (() => { try { return JSON.parse(t.metadata); } catch { return {}; } })()
        : (t.metadata || {});

    // Activar orden pendiente → abierta
    const [opened] = await db
      .update(trades)
      .set({
        entryPrice: nowPrice.toFixed(4),
        status: "open",
        orderType: "market", // la orden ya se activó y ahora es una operación normal
        metadata: {
          ...mdPrev,
          activatedAt: new Date().toISOString(),
          activatedFrom: "pending",
          marginUsed,
        },
      })
      .where(eq(trades.id, t.id))
      .returning();

    // Actualizar balance
    const newBalance = balanceNum - marginUsed;
    await db.update(user).set({ balance: newBalance.toFixed(2) }).where(eq(user.id, t.userId));

    // Registrar transacción
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId: t.userId,
      type: "trade",
      amount: (-marginUsed).toFixed(2),
      status: "completed",
      currency: "USD",
      metadata: {
        tradeId: t.id,
        transitioned: "pending → open",
        entryPrice: nowPrice.toFixed(4),
        symbol: t.symbol,
        side: t.side,
        quantity: qty,
        leverage: lev,
        marginUsed,
        takeProfit: t.takeProfit ?? null,
        stopLoss: t.stopLoss ?? null,
      },
    } as any);

    return NextResponse.json({
      success: true,
      trade: {
        ...opened,
        marginUsed: marginUsed.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
      },
    });
  } catch (error) {
    console.error("❌ Error activando pendiente:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
