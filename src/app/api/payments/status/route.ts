// src/app/api/payments/status/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { payments, tradingAccounts, user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Falta session_id" },
        { status: 400 }
      );
    }

    // 1) Info desde Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // 2) Info desde tu BD
    const [paymentRow] = await db
      .select({
        id: payments.id,
        referenceId: payments.referenceId,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        accountId: payments.accountId,
        customerEmail: payments.customerEmail,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        accountNumber: tradingAccounts.accountNumber,
        accountName: tradingAccounts.name,
        accountCurrency: tradingAccounts.currency,
        accountBalance: tradingAccounts.balance,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
      })
      .from(payments)
      .leftJoin(tradingAccounts, eq(payments.accountId, tradingAccounts.id))
      .leftJoin(user, eq(tradingAccounts.userId, user.id))
      .where(eq(payments.stripeSessionId, sessionId));

    return NextResponse.json({
      // Stripe
      stripe: {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_email,
      },
      // BD
      payment: paymentRow ?? null,
    });
  } catch (err: any) {
    console.error("❌ Error en /api/payments/status:", err);
    return NextResponse.json(
      { error: "Error consultando estado del pago", details: err.message },
      { status: 500 }
    );
  }
}
