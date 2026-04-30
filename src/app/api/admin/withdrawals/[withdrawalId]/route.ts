import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  accountAuditLogs,
  rolePermissions,
  tradingAccounts,
  transactions,
  user,
  userPermissions,
} from "@/db/schema";
import { getWithdrawalMethodLabel, type WithdrawalMethod } from "@/lib/withdrawals";
import { getActor } from "@/modules/auth/services/getActor";
import { getUserRoleId } from "@/modules/rbac/service";

type Decision = "approve" | "reject";

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ withdrawalId: string }> }
) {
  try {
    const { withdrawalId } = await ctx.params;
    if (!withdrawalId) {
      return NextResponse.json(
        { error: "Falta withdrawalId en la ruta" },
        { status: 400 }
      );
    }

    const actor = await getActor(req);
    if (!actor?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const adminUserId = actor.user.id;
    const roleId = await getUserRoleId(adminUserId);

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

    const [adminProfile] = await db
      .select({
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, adminUserId));

    const adminDisplayName =
      adminProfile?.name || adminProfile?.email || "Administrador";

    const permissions: Record<string, boolean> = {};
    for (const p of roleRows) {
      if (p.type === "mandatory") permissions[p.permissionId] = true;
      else if (p.type === "blocked") permissions[p.permissionId] = false;
    }
    for (const u of userRows) {
      permissions[u.permissionId] = u.allow;
    }

    if (!permissions["admin_balance_mgmt"]) {
      return NextResponse.json(
        { error: "No tienes permisos para autorizar retiros." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      decision?: Decision;
      note?: string;
      payoutMethod?: WithdrawalMethod;
    };

    const decision = body.decision;
    const note = String(body.note ?? "").trim();
    const payoutMethod = body.payoutMethod;

    if (decision !== "approve" && decision !== "reject") {
      return NextResponse.json(
        { error: "Decision invalida. Usa approve o reject." },
        { status: 400 }
      );
    }

    if (
      payoutMethod !== undefined &&
      payoutMethod !== "wallet" &&
      payoutMethod !== "bank_transfer" &&
      payoutMethod !== "cash"
    ) {
      return NextResponse.json(
        { error: "Metodo de retiro invalido." },
        { status: 400 }
      );
    }

    const [withdrawal] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, withdrawalId));

    if (!withdrawal || withdrawal.type !== "withdrawal") {
      return NextResponse.json(
        { error: "Solicitud de retiro no encontrada." },
        { status: 404 }
      );
    }

    if (withdrawal.status !== "pending") {
      return NextResponse.json(
        { error: "Esta solicitud ya fue procesada." },
        { status: 409 }
      );
    }

    const metadata = isRecordObject(withdrawal.metadata)
      ? { ...withdrawal.metadata }
      : {};

    if (metadata.source !== "user_withdrawal_request") {
      return NextResponse.json(
        { error: "Solo puedes gestionar retiros solicitados por usuarios." },
        { status: 400 }
      );
    }

    const accountId =
      typeof metadata.accountId === "string"
        ? metadata.accountId
        : typeof metadata.account_id === "string"
        ? metadata.account_id
        : null;

    if (!accountId) {
      return NextResponse.json(
        { error: "La solicitud no tiene una cuenta asociada valida." },
        { status: 400 }
      );
    }

    const reviewedAt = new Date();

    const result = await db.transaction(async (tx) => {
      const claimedMetadata = {
        ...metadata,
        processingBy: adminUserId,
        processingStartedAt: reviewedAt.toISOString(),
      };

      const claimedRows = await tx
        .update(transactions)
        .set({
          metadata: claimedMetadata,
        })
        .where(
          and(
            eq(transactions.id, withdrawal.id),
            eq(transactions.status, "pending"),
            sql`coalesce(${transactions.metadata} ->> 'processingBy', '') = ''`
          )
        )
        .returning({ id: transactions.id });

      if (claimedRows.length === 0) {
        throw new Error("WITHDRAWAL_ALREADY_PROCESSED");
      }

      const [account] = await tx
        .select()
        .from(tradingAccounts)
        .where(
          and(
            eq(tradingAccounts.id, accountId),
            eq(tradingAccounts.userId, withdrawal.userId)
          )
        );

      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      const amount = Number(withdrawal.amount ?? 0);
      const oldBalance = Number(account.balance ?? 0);
      const oldUserBalanceRows = await tx
        .select({ balance: user.balance })
        .from(user)
        .where(eq(user.id, withdrawal.userId));
      const oldUserBalance = Number(oldUserBalanceRows[0]?.balance ?? 0);

      if (decision === "approve") {
        if (amount > oldBalance) {
          throw new Error("INSUFFICIENT_ACCOUNT_BALANCE");
        }

        const newBalance = Number((oldBalance - amount).toFixed(2));
        const newUserBalance = Number(
          Math.max(0, oldUserBalance - amount).toFixed(2)
        );

        await tx
          .update(tradingAccounts)
          .set({
            balance: newBalance.toFixed(2),
            updatedAt: reviewedAt,
          })
          .where(eq(tradingAccounts.id, account.id));

        await tx
          .update(user)
          .set({
            balance: newUserBalance.toFixed(2),
          })
          .where(eq(user.id, withdrawal.userId));

        await tx
          .update(transactions)
          .set({
            status: "completed",
            metadata: {
              ...claimedMetadata,
              payoutMethod: payoutMethod ?? metadata.payoutMethod ?? "wallet",
              payoutMethodLabel: getWithdrawalMethodLabel(
                payoutMethod ?? String(metadata.payoutMethod ?? "wallet")
              ),
              reviewDecision: "approved",
              reviewedAt: reviewedAt.toISOString(),
              reviewedBy: adminUserId,
              adminNote: note || null,
              oldBalance,
              newBalance,
              oldUserBalance,
              newUserBalance,
            },
          })
          .where(eq(transactions.id, withdrawal.id));

        await tx.insert(accountAuditLogs).values({
          id: randomUUID(),
          accountId: account.id,
          adminId: adminUserId,
          action: "WITHDRAWAL_APPROVED",
          metadata: {
            withdrawalId: withdrawal.id,
            amount,
            currency: withdrawal.currency ?? account.currency,
            payoutMethod: payoutMethod ?? metadata.payoutMethod ?? "wallet",
            note: note || null,
            oldBalance,
            newBalance,
            oldUserBalance,
            newUserBalance,
          },
        });

        return {
          status: "completed",
          reviewDecision: "approved",
        };
      }

      await tx
        .update(transactions)
        .set({
          status: "failed",
          metadata: {
            ...claimedMetadata,
            payoutMethod: payoutMethod ?? metadata.payoutMethod ?? null,
            payoutMethodLabel: getWithdrawalMethodLabel(
              payoutMethod ?? String(metadata.payoutMethod ?? "")
            ),
            reviewDecision: "rejected",
            reviewedAt: reviewedAt.toISOString(),
            reviewedBy: adminUserId,
            adminNote: note || null,
          },
        })
        .where(eq(transactions.id, withdrawal.id));

      await tx.insert(accountAuditLogs).values({
        id: randomUUID(),
        accountId: account.id,
        adminId: adminUserId,
        action: "WITHDRAWAL_REJECTED",
        metadata: {
          withdrawalId: withdrawal.id,
          amount,
          currency: withdrawal.currency ?? account.currency,
          payoutMethod: payoutMethod ?? metadata.payoutMethod ?? null,
          note: note || null,
        },
      });

      return {
        status: "failed",
        reviewDecision: "rejected",
      };
    });

    return NextResponse.json({
      ok: true,
      withdrawalId,
      decision: result.reviewDecision,
      status: result.status,
      reviewedBy: adminUserId,
      reviewedByName: adminDisplayName,
    });
  } catch (error) {
    console.error("Error PATCH /api/admin/withdrawals/[withdrawalId]:", error);

    if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") {
      return NextResponse.json(
        { error: "La cuenta asociada al retiro no existe." },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "INSUFFICIENT_ACCOUNT_BALANCE"
    ) {
      return NextResponse.json(
        { error: "La cuenta no tiene saldo suficiente para aprobar el retiro." },
        { status: 409 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "WITHDRAWAL_ALREADY_PROCESSED"
    ) {
      return NextResponse.json(
        { error: "Esta solicitud ya fue procesada por otro administrador." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Error interno al procesar la solicitud de retiro." },
      { status: 500 }
    );
  }
}
