// src/app/api/admin/cuentas/[cuentaId]/ajuste/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  tradingAccounts,
  transactions,
  accountAuditLogs,
  rolePermissions,
  userPermissions,
  user, 
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getActor } from "@/modules/auth/services/getActor";
import { getUserRoleId } from "@/modules/rbac/service";

type TipoAjuste = "ABONO" | "CARGO";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ cuentaId: string }> }
) {
  try {
    // 1) Params dinámicos (Next 15)
    const { cuentaId } = await ctx.params;

    if (!cuentaId) {
      return NextResponse.json(
        { error: "Falta cuentaId en la ruta" },
        { status: 400 }
      );
    }

    // 2) Obtener actor (usuario logueado)
    const actor = await getActor(req);
    if (!actor?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const adminUserId = actor.user.id;

    // 3) Calcular permisos del usuario (igual que /api/user/me/permissions)
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

    // 4) Verificar permiso específico para ajustes de saldo
    if (!permissions["admin_balance_mgmt"]) {
      return NextResponse.json(
        { error: "No tienes permisos para ajustar saldos" },
        { status: 403 }
      );
    }

    // 5) Body del ajuste
    const body = await req.json();
    const { tipo, monto, motivo } = body as {
      tipo?: TipoAjuste;
      monto?: number;
      motivo?: string;
    };

    if (tipo !== "ABONO" && tipo !== "CARGO") {
      return NextResponse.json(
        { error: "Tipo de ajuste inválido. Use 'ABONO' o 'CARGO'." },
        { status: 400 }
      );
    }

    const amount = Number(monto);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Monto inválido. Debe ser un número positivo." },
        { status: 400 }
      );
    }

    // 6) Obtener cuenta
    const [account] = await db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.id, cuentaId));

    if (!account) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    const oldBalance = Number(account.balance ?? 0);
    const sign = tipo === "ABONO" ? 1 : -1;
    const newBalance = oldBalance + sign * amount;

    if (newBalance < 0) {
      return NextResponse.json(
        { error: "El ajuste dejaría la cuenta con saldo negativo." },
        { status: 400 }
      );
    }

    const currency = account.currency ?? "USD";
    const ownerUserId = account.userId;

    // 7) Transacción DB: actualizar cuenta + registrar movimiento + auditoría
    await db.transaction(async (tx) => {
      // a) actualizar balance de la cuenta
      await tx
        .update(tradingAccounts)
        .set({
          balance: newBalance.toFixed(2),
        })
        .where(eq(tradingAccounts.id, cuentaId));

      // 🔹 b) actualizar balance global del usuario
      const [userRow] = await tx
        .select()
        .from(user)
        .where(eq(user.id, ownerUserId));

      const oldUserBalance = Number(userRow?.balance ?? 0);
      const newUserBalance = oldUserBalance + sign * amount;

      await tx
        .update(user)
        .set({ balance: newUserBalance.toFixed(2) })
        .where(eq(user.id, ownerUserId));

      // c) registrar transacción financiera
      await tx.insert(transactions).values({
        id: randomUUID(),
        userId: ownerUserId,
        type: tipo === "ABONO" ? "deposit" : "withdrawal",
        amount: amount.toFixed(2),
        currency,
        status: "completed",
        metadata: {
          source: "admin_adjustment",
          accountId: cuentaId,
          adminId: adminUserId,
          motivo: motivo ?? null,
          oldBalance,
          newBalance,
          oldUserBalance,
          newUserBalance,
          direction: tipo,
        },
      });

      // d) auditoría administrativa
      await tx.insert(accountAuditLogs).values({
        id: randomUUID(),
        accountId: cuentaId,
        adminId: adminUserId,
        action: "BALANCE_ADJUSTMENT",
        metadata: {
          tipo,
          amount,
          motivo,
          oldBalance,
          newBalance,
          oldUserBalance,
          newUserBalance,
          currency,
        },
      });
    });


    return NextResponse.json({
      ok: true,
      accountId: cuentaId,
      oldBalance,
      newBalance,
      currency,
    });
  } catch (e) {
    console.error("Error POST /api/admin/cuentas/[cuentaId]/ajuste:", e);
    return NextResponse.json(
      { error: "Error interno al registrar ajuste" },
      { status: 500 }
    );
  }
}
