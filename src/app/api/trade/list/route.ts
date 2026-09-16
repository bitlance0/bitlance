import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
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
    const status = String(searchParams.get("status") ?? "all").trim().toLowerCase();

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

    let rows;
    if (status === "open" || status === "closed" || status === "pending") {
      rows = await db
        .select()
        .from(trades)
        .where(and(eq(trades.userId, targetUserId), eq(trades.status, status)))
        .orderBy(desc(trades.createdAt));
    } else {
      rows = await db
        .select()
        .from(trades)
        .where(eq(trades.userId, targetUserId))
        .orderBy(desc(trades.createdAt));
    }

    return NextResponse.json({
      success: true,
      trades: rows ?? [],
    });
  } catch (error) {
    console.error("Error listando trades:", error);
    return NextResponse.json(
      { success: false, error: "Error interno listando operaciones" },
      { status: 500 }
    );
  }
}
