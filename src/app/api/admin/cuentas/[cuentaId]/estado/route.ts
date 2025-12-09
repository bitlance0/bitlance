// src/app/api/admin/cuentas/[cuentaId]/estado/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  tradingAccounts,
  accountAuditLogs,
  rolePermissions,
  userPermissions,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getActor } from "@/modules/auth/services/getActor";
import { getUserRoleId } from "@/modules/rbac/service";

type EstadoUI = "activa" | "suspendida" | "cerrada";
type EstadoDB = "ACTIVE" | "SUSPENDED" | "CLOSED";

const uiToDb: Record<EstadoUI, EstadoDB> = {
  activa: "ACTIVE",
  suspendida: "SUSPENDED",
  cerrada: "CLOSED",
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ cuentaId: string }> } // 👈 patrón Next 15
) {
  try {
    // 1) Params dinámicos
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

    // 3) Permisos vía RBAC (igual que /api/user/me/permissions)
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

    // 🔒 Solo admins con permiso específico pueden cambiar estado de cuentas
    // puedes cambiar la key por otra si defines un permiso más fino
    const canChangeState =
      permissions["admin_balance_mgmt"] || permissions["admin_user_mgmt"];

    if (!canChangeState) {
      return NextResponse.json(
        { error: "No tienes permisos para cambiar el estado de la cuenta" },
        { status: 403 }
      );
    }

    // 4) Body
    const body = await req.json();
    const { estado } = body as { estado?: EstadoUI };

    if (!estado || !["activa", "suspendida", "cerrada"].includes(estado)) {
      return NextResponse.json(
        {
          error:
            "Estado inválido. Valores permitidos: activa, suspendida, cerrada",
        },
        { status: 400 }
      );
    }

    const estadoBD = uiToDb[estado];

    // 5) Buscar la cuenta
    const rows = await db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.id, cuentaId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    const cuenta = rows[0];
    const oldState = cuenta.status as EstadoDB;

    // Si no hay cambio, devolvemos OK sin tocar DB
    if (oldState === estadoBD) {
      return NextResponse.json({ ok: true, updated: false, estado });
    }

    // 6) Actualizar estado de la cuenta
    await db
      .update(tradingAccounts)
      .set({ status: estadoBD })
      .where(eq(tradingAccounts.id, cuentaId));

    // 7) Registrar auditoría con admin real
    try {
      await db.insert(accountAuditLogs).values({
        id: randomUUID(),
        accountId: cuentaId,
        adminId: adminUserId, // 👈 id real del usuario admin
        action: "STATE_CHANGE",
        metadata: {
          oldState,
          newState: estadoBD,
        },
      });
    } catch (auditError) {
      console.error(
        "Error insertando en account_audit_logs (se ignora para no romper la API):",
        auditError
      );
      // No lanzamos error para no devolver 500 si solo falla la auditoría
    }

    return NextResponse.json({ ok: true, updated: true, estado });
  } catch (e) {
    console.error("Error PATCH /api/admin/cuentas/[cuentaId]/estado:", e);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
