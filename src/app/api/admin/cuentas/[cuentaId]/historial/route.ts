import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  accountAuditLogs,
  rolePermissions,
  userPermissions,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getActor } from "@/modules/auth/services/getActor";
import { getUserRoleId } from "@/modules/rbac/service";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ cuentaId: string }> } // 🔥 Next.js 15 dynamic params
) {
  try {
    // 1) Obtener params dinámicos
    const { cuentaId } = await ctx.params;

    if (!cuentaId) {
      return NextResponse.json(
        { error: "Falta cuentaId en la ruta" },
        { status: 400 }
      );
    }

    // 2) Actor autenticado
    const actor = await getActor(req);

    if (!actor?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const adminUserId = actor.user.id;

    // 3) Cargar permisos vía RBAC
    const roleId = await getUserRoleId(adminUserId);

    const roleRows = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    const userRows = await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, adminUserId));

    const permissions: Record<string, boolean> = {};

    for (const p of roleRows) {
      if (p.type === "mandatory") permissions[p.permissionId] = true;
      else if (p.type === "blocked") permissions[p.permissionId] = false;
    }

    for (const u of userRows) {
      permissions[u.permissionId] = u.allow;
    }

    // 🔐 Permiso requerido para ver historial
    const canViewHistory =
      permissions["admin2_view_logs"] ||
      permissions["admin_balance_mgmt"] ||
      permissions["admin_user_mgmt"];

    if (!canViewHistory) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para ver el historial de esta cuenta",
        },
        { status: 403 }
      );
    }

    // 4) Consultar historial de auditoría
    const rows = await db
      .select()
      .from(accountAuditLogs)
      .where(eq(accountAuditLogs.accountId, cuentaId))
      .orderBy(desc(accountAuditLogs.createdAt))
      .limit(100);

    // 5) Normalizar para UI
    const history = rows.map((row) => {
      const rawAction = row.action ?? "UNKNOWN";

      let type: "state_change" | "balance_adjustment" | "other" = "other";

      if (rawAction === "STATE_CHANGE") type = "state_change";
      else if (rawAction === "BALANCE_ADJUSTMENT") type = "balance_adjustment";

      return {
        id: row.id,
        accountId: row.accountId,
        adminId: row.adminId,
        action: rawAction,
        type,
        metadata: row.metadata ?? {},
        createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      };
    });

    return NextResponse.json({ history });
  } catch (e) {
    console.error(
      "Error GET /api/admin/cuentas/[cuentaId]/historial:",
      e
    );
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
