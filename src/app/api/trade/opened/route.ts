import { NextResponse } from "next/server";
import { db } from "@/db";
import { trades } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/trades/opened?userId=abc123
 * Lista todas las operaciones abiertas del usuario
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Falta userId" }, { status: 400 });
    }

    const openTrades = await db
      .select()
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.status, "open")));

    return NextResponse.json({ success: true, trades: openTrades });
  } catch (error) {
    console.error("❌ Error listando operaciones abiertas:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
