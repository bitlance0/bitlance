// src/app/api/users/[userId]/roles/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userRoles, user as userTbl } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getActor, unauthorized } from "@/modules/auth/services/getActor";
import { getUserRoleId } from "@/modules/rbac/service";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const { userId } = await ctx.params;
  const r = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
  return NextResponse.json({ roleId: r[0]?.roleId ?? "user" });
}

export async function PUT(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const { userId } = await ctx.params;

  const actor = await getActor(req);
  if (!actor?.user?.id) return unauthorized();

  const actorId = actor.user.id;
  const actorRole = await getUserRoleId(actorId);

  const { roleId }: { roleId: "user" | "collaborator" | "admin" | "super" } = await req.json();

  // 0) Permisos básicos para editar roles
  if (actorRole !== "admin" && actorRole !== "super") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1) REGLA NUEVA: Solo SUPER puede asignar el rol "super" (a cualquiera, incluido a sí mismo)
  if (roleId === "super" && actorRole !== "super") {
    return NextResponse.json(
      { error: "OnlySuperCanAssignSuper", detail: "Solo un usuario con rol SUPER puede asignar el rol super." },
      { status: 403 }
    );
  }

  // 2) Guard: último SUPER no se puede degradar (evita lockout)
  const [{ c: superCount }] = await db
    .select({ c: sql<number>`count(*)`.mapWith(Number) })
    .from(userRoles)
    .where(eq(userRoles.roleId, "super"))
    .limit(1);

  // Rol actual del usuario objetivo (para saber si es super)
  const currentTarget = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
  const targetCurrentRole = (currentTarget[0]?.roleId ?? "user") as "user" | "collaborator" | "admin" | "super";

  const isSelf = actorId === userId;
  const targetIsSuperNow = targetCurrentRole === "super";
  const targetWillStopBeingSuper = targetIsSuperNow && roleId !== "super";
  const targetIsLastSuper = targetIsSuperNow && superCount <= 1;

  if (targetWillStopBeingSuper && targetIsLastSuper) {
    // Impide degradar al último super (sea a sí mismo o a otro)
    return NextResponse.json(
      { error: "LastSuperGuard", detail: "No puedes degradar al último SUPER del sistema." },
      { status: 409 }
    );
  }

  // 3) Persistir cambio de rol
  await db
    .insert(userRoles)
    .values({ userId, roleId, assignedBy: actorId })
    .onConflictDoUpdate({
      target: [userRoles.userId],
      set: { roleId, assignedBy: actorId },
    });

  // (opcional) cachear un rol visible en tabla user (si lo usas en UI)
  await db
    .update(userTbl)
    .set({ role: roleId === "super" ? ("admin" as any) : (roleId as any) })
    .where(eq(userTbl.id, userId));

  return NextResponse.json({ ok: true });
}
