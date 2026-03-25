import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { trades, transactions } from "@/db/schema";
import { getActor } from "@/modules/auth/services/getActor";

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

    const { tradeId } = await req.json();
    const normalizedTradeId = String(tradeId ?? "").trim();
    if (!normalizedTradeId) {
      return NextResponse.json(
        { success: false, error: "Falta tradeId" },
        { status: 400 }
      );
    }

    const [trade] = await db
      .select()
      .from(trades)
      .where(eq(trades.id, normalizedTradeId));

    if (!trade) {
      return NextResponse.json(
        { success: false, error: "Trade no encontrado" },
        { status: 404 }
      );
    }

    if (!internalRequest && actor?.user?.id !== trade.userId) {
      return NextResponse.json(
        { success: false, error: "No autorizado para cancelar este trade" },
        { status: 403 }
      );
    }

    if (trade.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Solo se pueden cancelar ordenes pendientes" },
        { status: 400 }
      );
    }

    const metadata = parseTradeMetadata(trade.metadata);

    const [closed] = await db
      .update(trades)
      .set({
        status: "closed",
        orderType: "pending",
        closePrice: null,
        profit: "0.00",
        closedAt: new Date(),
        metadata: {
          ...metadata,
          cancelled: true,
          cancelledAt: new Date().toISOString(),
          cancelledBy: internalRequest ? "engine" : "user",
        },
      })
      .where(and(eq(trades.id, trade.id), eq(trades.status, "pending")))
      .returning();

    if (!closed) {
      return NextResponse.json(
        { success: false, error: "La orden pendiente ya fue procesada" },
        { status: 409 }
      );
    }

    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId: trade.userId,
      type: "trade",
      amount: "0.00",
      status: "completed",
      currency: "USD",
      metadata: {
        kind: "trade_pending_cancel",
        tradeId: trade.id,
        cancelled: true,
      },
    });

    return NextResponse.json({ success: true, trade: closed });
  } catch (error) {
    console.error("Error cancelando pendiente:", error);
    return NextResponse.json(
      { success: false, error: "Error interno cancelando pendiente" },
      { status: 500 }
    );
  }
}
