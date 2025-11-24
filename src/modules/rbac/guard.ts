// src/modules/rbac/guard.ts
import { getActor } from "@/modules/auth/services/getActor";
import { getUserRoleId } from "@/modules/rbac/service";
import { db } from "@/db";
import { userPermissions, rolePermissions } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Devuelve el rol y permisos efectivos del actor autenticado.
 */
export async function getAuthContext(req: Request) {
  const actor = await getActor(req);
  if (!actor?.user?.id) return null;
  const userId = actor.user.id;
  const role = await getUserRoleId(userId);

  // permisos por rol
  const rolePerms = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, role));

  // overrides del usuario
  const userPerms = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));

  // combinamos
  const effective: Record<string, boolean> = {};
  for (const rp of rolePerms) {
    if (rp.type === "mandatory") effective[rp.permissionId] = true;
    else if (rp.type === "blocked") effective[rp.permissionId] = false;
  }
  for (const up of userPerms) {
    effective[up.permissionId] = up.allow;
  }

  return { userId, role, permissions: effective };
}

/**
 * Verifica si el actor tiene un permiso o rol requerido.
 * Si falla, devuelve `null` o lanza un error si se usa dentro de un endpoint.
 */
export async function requireAuth(
  req: Request,
  opts?: { minRole?: "user" | "collaborator" | "admin" | "super"; permission?: string }
) {
  const ctx = await getAuthContext(req);
  if (!ctx) return null;

  const rank = { user: 1, collaborator: 2, admin: 3, super: 4 };
  const minRank = opts?.minRole ? rank[opts.minRole] : 1;

  const hasMinRole = rank[ctx.role] >= minRank;
  const hasPermission = opts?.permission ? !!ctx.permissions[opts.permission] : true;

  if (hasMinRole && hasPermission) return ctx;
  return null;
}
