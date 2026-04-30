import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { tradingAccounts, transactions } from "@/db/schema";
import {
  getWithdrawalMethodLabel,
  MIN_WITHDRAWAL_USD,
} from "@/lib/withdrawals";
import {
  createWithdrawalRequest,
  WithdrawalRequestError,
} from "@/lib/withdrawal-requests";
import { getActor } from "@/modules/auth/services/getActor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WithdrawalItem = {
  id: string;
  simbolo: string;
  tipo: string;
  estado: string;
  cantidad: number;
  precio: number;
  total: number;
  cuenta: string;
  accountId: string | null;
  fecha: string;
  withdrawalReference?: string | null;
  destinationAddress?: string | null;
  payoutMethod?: string | null;
  payoutMethodLabel?: string | null;
  ticketReference?: string | null;
  reviewDecision?: string | null;
  reviewedAt?: string | null;
  adminNote?: string | null;
  profitLoss?: number;
};

function normalizeStatus(status?: string | null) {
  if (status === "completed") return "completado";
  if (status === "pending") return "pendiente";
  if (status === "failed") return "rechazado";
  return "desconocido";
}

function mapWithdrawal(row: typeof transactions.$inferSelect): WithdrawalItem {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const amount = Number(row.amount ?? 0);

  return {
    id: row.id,
    simbolo: String(meta.symbol ?? row.currency ?? "USD"),
    tipo: "retiro",
    estado: normalizeStatus(row.status),
    cantidad: Number(meta.quantity ?? 1),
    precio: amount,
    total: amount,
    cuenta: String(meta.accountName ?? "Cuenta de trading"),
    accountId:
      typeof meta.accountId === "string"
        ? meta.accountId
        : typeof meta.account_id === "string"
        ? meta.account_id
        : null,
    fecha: row.createdAt?.toISOString() ?? new Date().toISOString(),
    withdrawalReference:
      typeof meta.withdrawalReference === "string"
        ? meta.withdrawalReference
        : null,
    destinationAddress:
      typeof meta.destinationAddress === "string"
        ? meta.destinationAddress
        : null,
    payoutMethod:
      typeof meta.payoutMethod === "string" ? meta.payoutMethod : null,
    payoutMethodLabel: getWithdrawalMethodLabel(
      typeof meta.payoutMethod === "string" ? meta.payoutMethod : null
    ),
    ticketReference:
      typeof meta.ticketReference === "string" ? meta.ticketReference : null,
    reviewDecision:
      typeof meta.reviewDecision === "string" ? meta.reviewDecision : null,
    reviewedAt: typeof meta.reviewedAt === "string" ? meta.reviewedAt : null,
    adminNote: typeof meta.adminNote === "string" ? meta.adminNote : null,
    profitLoss:
      typeof meta.profitLoss === "number"
        ? meta.profitLoss
        : typeof meta.profit === "number"
        ? meta.profit
        : undefined,
  };
}

export async function GET(req: Request) {
  try {
    const actor = await getActor(req);
    if (!actor?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = actor.user.id;

    const [accountsRows, withdrawalRows] = await Promise.all([
      db
        .select()
        .from(tradingAccounts)
        .where(eq(tradingAccounts.userId, userId)),
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "withdrawal")
          )
        )
        .orderBy(desc(transactions.createdAt))
        .limit(200),
    ]);

    const pendingByAccount = new Map<string, number>();

    for (const row of withdrawalRows) {
      if (row.status !== "pending") continue;
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const accountId =
        typeof meta.accountId === "string"
          ? meta.accountId
          : typeof meta.account_id === "string"
          ? meta.account_id
          : null;

      if (!accountId) continue;

      pendingByAccount.set(
        accountId,
        (pendingByAccount.get(accountId) ?? 0) + Number(row.amount ?? 0)
      );
    }

    const accounts = accountsRows.map((account) => {
      const balance = Number(account.balance ?? 0);
      const pendingWithdrawals = pendingByAccount.get(account.id) ?? 0;
      const availableBalance = Math.max(0, balance - pendingWithdrawals);

      return {
        id: account.id,
        accountNumber: account.accountNumber,
        name: account.name,
        currency: account.currency,
        status: account.status,
        isDefault: account.isDefault,
        balance,
        pendingWithdrawals,
        availableBalance,
      };
    });

    return NextResponse.json({
      accounts,
      withdrawals: withdrawalRows.map(mapWithdrawal),
      minWithdrawal: MIN_WITHDRAWAL_USD,
    });
  } catch (error) {
    console.error("Error GET /api/user/withdrawals:", error);
    return NextResponse.json(
      { error: "Error al cargar los retiros" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await getActor(req);
    if (!actor?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = actor.user.id;
    const body = (await req.json()) as {
      accountId?: string;
      amount?: number | string;
    };

    const accountId = String(body.accountId ?? "").trim();
    const amount = Number(body.amount);

    const result = await createWithdrawalRequest({
      userId,
      accountId,
      amount,
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

    console.error("Error POST /api/user/withdrawals:", error);
    return NextResponse.json(
      {
        error: "No se pudo registrar la solicitud de retiro.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
