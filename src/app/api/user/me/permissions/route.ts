// src/app/api/user/me/permissions/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getActor } from "@/modules/auth/services/getActor";
import { rolePermissions, userPermissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserRoleId } from "@/modules/rbac/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const actor = await getActor(req);
  if (!actor?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = actor.user.id;
  const roleId = await getUserRoleId(userId);

  // 1️⃣ permisos base por rol
  const roleRows = await db
    .select()
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));

  // 2️⃣ overrides del usuario (manual)
  const userRows = await db
    .select()
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  // 3️⃣ combinamos
  const permissions: Record<string, boolean> = {};
  for (const p of roleRows) {
    if (p.type === "mandatory") permissions[p.permissionId] = true;
    else if (p.type === "blocked") permissions[p.permissionId] = false;
  }
  for (const u of userRows) {
    permissions[u.permissionId] = u.allow;
  }

  return NextResponse.json({ permissions });
}
