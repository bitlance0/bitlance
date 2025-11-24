import { NextResponse } from "next/server";
import { db } from "@/db";
import { trades } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status"); // "open" | "closed" | "all"

    if (!userId) {
      return NextResponse.json({ success: false, error: "Falta userId" }, { status: 400 });
    }

    // Filtro dinámico de estado
    let rows;
    if (status === "open" || status === "closed") {
      rows = await db
        .select()
        .from(trades)
        .where(and(eq(trades.userId, userId), eq(trades.status, status)))
        .orderBy(trades.createdAt);
    } else {
      rows = await db
        .select()
        .from(trades)
        .where(eq(trades.userId, userId))
        .orderBy(trades.createdAt);
    }

    return NextResponse.json({
      success: true,
      trades: rows ?? [],
    });
  } catch (e) {
    console.error("❌ list trades:", e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
