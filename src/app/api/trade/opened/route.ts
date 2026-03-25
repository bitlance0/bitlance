import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { trades, user } from "@/db/schema";
import { getActor } from "@/modules/auth/services/getActor";

async function isPrivilegedUser(userId: string) {
  const [row] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId));

  return row?.role === "admin";
}

export async function GET(req: Request) {
  try {
    const actor = await getActor(req);
    if (!actor?.user?.id) {
      return NextResponse.json(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const actorUserId = actor.user.id;
    const { searchParams } = new URL(req.url);
    const requestedUserId = String(searchParams.get("userId") ?? "").trim();

    let targetUserId = actorUserId;
    if (requestedUserId && requestedUserId !== actorUserId) {
      const privileged = await isPrivilegedUser(actorUserId);
      if (!privileged) {
        return NextResponse.json(
          { success: false, error: "No autorizado para consultar otro usuario" },
          { status: 403 }
        );
      }
      targetUserId = requestedUserId;
    }

    const openTrades = await db
      .select()
      .from(trades)
      .where(and(eq(trades.userId, targetUserId), eq(trades.status, "open")));

    return NextResponse.json({ success: true, trades: openTrades });
  } catch (error) {
    console.error("Error listando operaciones abiertas:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
