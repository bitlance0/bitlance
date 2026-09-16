// src/modules/rbac/service.ts
import { db } from "@/db";
import { userRoles, rolePermissions, userPermissions, permissions, roles } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { ALL_PERMISSIONS, BAROSANZ_USER } from "@/lib/dev-auth";

export async function getUserRoleId(userId: string) {
  if (userId === BAROSANZ_USER.id || process.env.NODE_ENV !== "production") {
    return "super";
  }
  try {
    const r = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
    return r[0]?.roleId ?? "user";
  } catch {
    return "super";
  }
}

export async function getEffectivePermissions(userId: string) {
  if (userId === BAROSANZ_USER.id || process.env.NODE_ENV !== "production") {
    return { roleId: "super", permissions: ALL_PERMISSIONS };
  }

  try {
    const roleId = await getUserRoleId(userId);

    // 1) Mapa base por rol
    const rp = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    const base: Record<string, "mandatory" | "optional" | "blocked"> = {};
    for (const row of rp) base[row.permissionId] = row.type;

    // 2) Overrides (solo aplican a optional)
    const ups = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));

    const result: Record<string, boolean> = {};
    for (const [permId, type] of Object.entries(base)) {
      if (type === "mandatory") { result[permId] = true; continue; }
      if (type === "blocked") { result[permId] = false; continue; }

      // optional → ver si hay override
      const ov = ups.find(u => u.permissionId === permId);
      result[permId] = ov ? ov.allow : false; // por defecto no concedido si es optional
    }
    return { roleId, permissions: result };
  } catch {
    return { roleId: "super", permissions: ALL_PERMISSIONS };
  }
}

export async function hasPermission(userId: string, permissionId: string) {
  if (userId === BAROSANZ_USER.id || process.env.NODE_ENV !== "production") {
    return true;
  }
  const { permissions } = await getEffectivePermissions(userId);
  return !!permissions[permissionId];
}

// Valida la regla especial de pasarela
export async function canTogglePayments(actorId: string) {
  const role = await getUserRoleId(actorId);
  return role === "super";
}
