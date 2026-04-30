import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { rolePermissions, userPermissions } from "@/db/schema";
import {
  createWithdrawalRequest,
  WithdrawalRequestError,
} from "@/lib/withdrawal-requests";
import { getActor } from "@/modules/auth/services/getActor";
import { getUserRoleId } from "@/modules/rbac/service";

export async function POST(
  req: Request,
  context: { params: Promise<{ usuarioId: string }> }
) {
  try {
    const actor = await getActor(req);
    if (!actor?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const adminUserId = actor.user.id;
    const roleId = await getUserRoleId(adminUserId);
    const { usuarioId } = await context.params;

    if (!usuarioId) {
      return NextResponse.json(
        { error: "Falta usuarioId en la ruta" },
        { status: 400 }
      );
    }

    const [roleRows, userRows] = await Promise.all([
      db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId)),
      db
        .select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, adminUserId)),
    ]);

    const permissions: Record<string, boolean> = {};
    for (const p of roleRows) {
      if (p.type === "mandatory") permissions[p.permissionId] = true;
      else if (p.type === "blocked") permissions[p.permissionId] = false;
    }
    for (const u of userRows) {
      permissions[u.permissionId] = u.allow;
    }

    const canCreateWithdrawal =
      permissions["admin_balance_mgmt"] || permissions["admin_user_mgmt"];

    if (!canCreateWithdrawal) {
      return NextResponse.json(
        { error: "No tienes permisos para programar retiros." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      accountId?: string;
      amount?: number | string;
    };

    const result = await createWithdrawalRequest({
      userId: usuarioId,
      accountId: String(body.accountId ?? ""),
      amount: Number(body.amount),
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof WithdrawalRequestError) {
      const status =
        error.code === "ACCOUNT_NOT_FOUND"
          ? 404
          : error.code === "ACCOUNT_REQUIRED" ||
            error.code === "INVALID_AMOUNT" ||
            error.code === "MIN_AMOUNT" ||
            error.code === "ACCOUNT_NOT_ACTIVE" ||
            error.code === "INSUFFICIENT_BALANCE"
          ? 400
          : 500;

      return NextResponse.json({ error: error.message }, { status });
    }

    console.error(
      "Error POST /api/admin/usuarios/[usuarioId]/withdrawals:",
      error
    );
    return NextResponse.json(
      {
        error: "No se pudo registrar la solicitud de retiro.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
