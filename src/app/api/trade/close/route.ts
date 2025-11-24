// /app/api/trade/close/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { trades, user, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { tradeId, closePrice } = await req.json();

    if (!tradeId) {
      return NextResponse.json(
        { success: false, error: "Falta tradeId" },
        { status: 400 }
      );
    }

    // 1️⃣ Buscar trade por id
    const [trade] = await db
      .select()
      .from(trades)
      .where(eq(trades.id, String(tradeId)));

    if (!trade) {
      return NextResponse.json(
        { success: false, error: "Trade no encontrado" },
        { status: 404 }
      );
    }

    if (trade.status === "closed") {
      return NextResponse.json(
        { success: false, error: "La operación ya está cerrada" },
        { status: 400 }
      );
    }

    // Opcional: evitar cerrar órdenes pendientes con este endpoint
    if (trade.status === "pending") {
      return NextResponse.json(
        { success: false, error: "No puedes cerrar una orden pendiente con este endpoint" },
        { status: 400 }
      );
    }

    const entry = Number(trade.entryPrice ?? 0);
    const qty = Number(trade.quantity ?? 0);
    const lev = Number(trade.leverage ?? 1);

    if (!entry || !qty) {
      return NextResponse.json(
        { success: false, error: "Datos de trade incompletos (entry/quantity)" },
        { status: 400 }
      );
    }

    // 2️⃣ Derivar precio de cierre si no llegó
    const close =
      closePrice && Number(closePrice) > 0
        ? Number(closePrice)
        : Number((entry * (1 + (Math.random() - 0.5) * 0.02)).toFixed(5));

    const sideFactor = trade.side === "buy" ? 1 : -1;

    // PnL en función de la diferencia, cantidad y apalancamiento
    const profit = Number(
      ((close - entry) * qty * lev * sideFactor).toFixed(2)
    );

    // 3️⃣ Leer metadata y margen usado
    const mdRaw =
      typeof trade.metadata === "string"
        ? (() => {
            try {
              return JSON.parse(trade.metadata);
            } catch {
              return {};
            }
          })()
        : (trade.metadata as any) || {};

    const marginUsed = Number(mdRaw.marginUsed ?? entry * qty) || 0;

    // Dinero que vuelve a la cuenta: margen liberado + PnL
    const cashDelta = Number((marginUsed + profit).toFixed(2));

    // 4️⃣ Actualizar trade en BD
    const closedAt = new Date();

    await db
      .update(trades)
      .set({
        closePrice: close.toFixed(4),
        profit: profit.toFixed(2),
        status: "closed",
        closedAt,
        // mantenemos metadata original + bandera de cierre
        metadata: {
          ...mdRaw,
          closedBy: "manual",
          closedReason: "user_close",
        },
      })
      .where(eq(trades.id, trade.id));

    // 5️⃣ Obtener usuario y balance actual
    const [u] = await db.select().from(user).where(eq(user.id, trade.userId));
    if (!u) {
      return NextResponse.json(
        { success: false, error: "Usuario asociado al trade no encontrado" },
        { status: 404 }
      );
    }

    const currentBalance = Number(u.balance ?? 0);
    const newBalance = Number((currentBalance + cashDelta).toFixed(2));

    // 6️⃣ Actualizar balance de usuario
    await db
      .update(user)
      .set({ balance: newBalance.toFixed(2) })
      .where(eq(user.id, trade.userId));

    // 7️⃣ Insertar transacción de cierre
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId: trade.userId,
      type: "trade", // mantenemos el union type del schema
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
        quantity: qty,
        leverage: lev,
        profit,
        marginUsed,
        cashDelta,
      } as any,
    } as any);

    // 8️⃣ Respuesta
    return NextResponse.json({
      success: true,
      trade: {
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side,
        entryPrice: entry.toFixed(4),
        closePrice: close, // número
        quantity: qty,
        leverage: lev,
        profit, // número
        status: "closed",
        createdAt: trade.createdAt,
        closedAt: closedAt.toISOString(),
        metadata: mdRaw,
        newBalance,
      },
      newBalance, // número global
    });
  } catch (error) {
    console.error("❌ close trade:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
