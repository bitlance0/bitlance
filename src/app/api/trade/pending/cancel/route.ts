// src/app/api/trade/pending/cancel/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { trades, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { tradeId } = await req.json();
    if (!tradeId)
      return NextResponse.json(
        { success: false, error: "Falta tradeId" },
        { status: 400 }
      );

    const [t] = await db.select().from(trades).where(eq(trades.id, String(tradeId)));
    if (!t)
      return NextResponse.json({ success: false, error: "Trade no encontrado" }, { status: 404 });

    if (t.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Solo se pueden cancelar órdenes pendientes" },
        { status: 400 }
      );
    }

    // Parse metadata
    const mdPrev =
      typeof t.metadata === "string"
        ? (() => { try { return JSON.parse(t.metadata); } catch { return {}; } })()
        : (t.metadata || {});

    // Cancelar orden
    const [closed] = await db
      .update(trades)
      .set({
        status: "closed",
        orderType: "pending", // sigue siendo una orden pendiente, pero finalizada
        closePrice: null,
        profit: "0.00",
        closedAt: new Date(),
        metadata: {
          ...mdPrev,
          cancelled: true,
          cancelledAt: new Date().toISOString(),
          takeProfit: t.takeProfit ?? null,
          stopLoss: t.stopLoss ?? null,
        },
      })
      .where(eq(trades.id, t.id))
      .returning();

    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId: t.userId,
      type: "trade",
      amount: "0.00",
      status: "completed",
      currency: "USD",
      metadata: {
        tradeId: t.id,
        cancelled: true,
        takeProfit: t.takeProfit ?? null,
        stopLoss: t.stopLoss ?? null,
      },
    } as any);

    return NextResponse.json({ success: true, trade: closed });
  } catch (e) {
    console.error("cancel pending:", e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
