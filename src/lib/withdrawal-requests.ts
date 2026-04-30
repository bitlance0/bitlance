import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { tradingAccounts, transactions } from "@/db/schema";
import {
  buildWithdrawalDestinationAddress,
  buildWithdrawalReference,
  buildWithdrawalTicketReference,
  getWithdrawalMethodLabel,
  MIN_WITHDRAWAL_USD,
} from "@/lib/withdrawals";

export class WithdrawalRequestError extends Error {
  constructor(
    public code:
      | "ACCOUNT_REQUIRED"
      | "INVALID_AMOUNT"
      | "MIN_AMOUNT"
      | "ACCOUNT_NOT_FOUND"
      | "ACCOUNT_NOT_ACTIVE"
      | "INSUFFICIENT_BALANCE",
    message: string
  ) {
    super(message);
    this.name = "WithdrawalRequestError";
  }
}

export async function createWithdrawalRequest(input: {
  userId: string;
  accountId: string;
  amount: number;
}) {
  const userId = String(input.userId).trim();
  const accountId = String(input.accountId).trim();
  const amount = Number(input.amount);

  if (!accountId) {
    throw new WithdrawalRequestError(
      "ACCOUNT_REQUIRED",
      "Debes seleccionar una cuenta."
    );
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new WithdrawalRequestError(
      "INVALID_AMOUNT",
      "Ingresa un monto valido."
    );
  }

  if (amount < MIN_WITHDRAWAL_USD) {
    throw new WithdrawalRequestError(
      "MIN_AMOUNT",
      `El retiro minimo es de $${MIN_WITHDRAWAL_USD.toLocaleString("en-US")} USD.`
    );
  }

  const [account] = await db
    .select()
    .from(tradingAccounts)
    .where(
      and(eq(tradingAccounts.id, accountId), eq(tradingAccounts.userId, userId))
    );

  if (!account) {
    throw new WithdrawalRequestError(
      "ACCOUNT_NOT_FOUND",
      "La cuenta seleccionada no existe."
    );
  }

  if (account.status !== "ACTIVE") {
    throw new WithdrawalRequestError(
      "ACCOUNT_NOT_ACTIVE",
      "Solo puedes retirar desde cuentas activas."
    );
  }

  const pendingRows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "withdrawal"),
        eq(transactions.status, "pending")
      )
    );

  const pendingForAccount = pendingRows.reduce((sum, row) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const rowAccountId =
      typeof meta.accountId === "string"
        ? meta.accountId
        : typeof meta.account_id === "string"
        ? meta.account_id
        : null;

    if (rowAccountId !== accountId) return sum;
    return sum + Number(row.amount ?? 0);
  }, 0);

  const availableBalance =
    Number(account.balance ?? 0) - Number(pendingForAccount ?? 0);

  if (amount > availableBalance) {
    throw new WithdrawalRequestError(
      "INSUFFICIENT_BALANCE",
      `Saldo insuficiente. Disponible para retiro: $${Math.max(
        0,
        availableBalance
      ).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} USD.`
    );
  }

  const createdAt = new Date();
  const id = randomUUID();
  const withdrawalReference = buildWithdrawalReference(id);
  const destinationAddress = buildWithdrawalDestinationAddress(
    userId,
    account.id,
    id
  );
  const ticketReference = buildWithdrawalTicketReference(id);
  const metadata = {
    source: "user_withdrawal_request",
    symbol: account.currency,
    quantity: 1,
    price: amount,
    total: amount,
    accountId: account.id,
    accountName: account.name,
    accountNumber: account.accountNumber,
    withdrawalReference,
    destinationAddress,
    payoutMethod: null,
    ticketReference,
  };

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      id,
      userId,
      type: "withdrawal",
      amount: amount.toFixed(2),
      currency: account.currency,
      status: "pending",
      metadata,
      createdAt,
    });
  });

  return {
    message: "Solicitud de retiro enviada correctamente.",
    withdrawal: {
      id,
      simbolo: account.currency,
      tipo: "retiro",
      estado: "pendiente",
      cantidad: 1,
      precio: amount,
      total: amount,
      cuenta: account.name,
      accountId: account.id,
      fecha: createdAt.toISOString(),
      withdrawalReference,
      destinationAddress,
      payoutMethod: null,
      payoutMethodLabel: getWithdrawalMethodLabel(null),
      ticketReference,
      reviewDecision: null,
      reviewedAt: null,
      adminNote: null,
    },
  };
}
