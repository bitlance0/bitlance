import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  rolePermissions,
  transactions,
  userPermissions,
} from "@/db/schema";
import { getActor } from "@/modules/auth/services/getActor";
import { getUserRoleId } from "@/modules/rbac/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getEffectivePermissions(userId: string) {
  const roleId = await getUserRoleId(userId);

  const [roleRows, userRows] = await Promise.all([
    db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId)),
    db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId)),
  ]);

  const permissions: Record<string, boolean> = {};
  for (const p of roleRows) {
    if (p.type === "mandatory") permissions[p.permissionId] = true;
    else if (p.type === "blocked") permissions[p.permissionId] = false;
  }
  for (const u of userRows) {
    permissions[u.permissionId] = u.allow;
  }

  return permissions;
}

export async function GET(req: Request) {
  try {
    const actor = await getActor(req);
    if (!actor?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = actor.user.id;
    const permissions = await getEffectivePermissions(userId);
    const canReviewWithdrawals = Boolean(permissions["admin_balance_mgmt"]);

    const sourceClause = sql`coalesce(${transactions.metadata} ->> 'source', '') = 'user_withdrawal_request'`;

    const [userPendingRows, adminPendingRows] = await Promise.all([
      db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "withdrawal"),
            eq(transactions.status, "pending"),
            sourceClause
          )
        )
        .limit(1),
      canReviewWithdrawals
        ? db
            .select({ id: transactions.id })
            .from(transactions)
            .where(
              and(
                eq(transactions.type, "withdrawal"),
                eq(transactions.status, "pending"),
                sourceClause
              )
            )
            .limit(1)
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      hasUserPendingWithdrawals: userPendingRows.length > 0,
      hasAdminPendingWithdrawals: adminPendingRows.length > 0,
      canReviewWithdrawals,
    });
  } catch (error) {
    console.error("Error GET /api/withdrawals/notifications:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los indicadores de retiro." },
      { status: 500 }
    );
  }
}
