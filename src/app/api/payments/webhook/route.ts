import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/db";
import { payments, tradingAccounts, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getWebhookStripe = () => getStripe();

export async function POST(req: Request) {
  const stripe = getWebhookStripe();
  const body = await req.text();
  const headerList = await headers();
  const sig = headerList.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("❌ Firma webhook inválida:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log("📩 Evento Stripe recibido:", event.type);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("➡️ checkout.session.completed session.id:", session.id);

      // ⚠️ Todo en transacción para evitar dobles abonos
      await db.transaction(async (tx) => {
        // 1) Buscar payment en tu tabla por session.id
        const [paymentRow] = await tx
          .select()
          .from(payments)
          .where(eq(payments.stripeSessionId, session.id));

        if (!paymentRow) {
          console.warn(
            "⚠️ Webhook: payment no encontrado para session",
            session.id
          );
          return;
        }

        console.log("✅ Payment encontrado:", {
          paymentId: paymentRow.id,
          referenceId: paymentRow.referenceId,
          status: paymentRow.status,
          accountId: paymentRow.accountId,
          amount: paymentRow.amount,
          currency: paymentRow.currency,
        });

        // Idempotencia: si ya estaba acreditado, no repetir
        if (paymentRow.status === "paid_and_credited") {
          console.log(
            "ℹ️ Payment ya estaba paid_and_credited, se ignora:",
            paymentRow.id
          );
          return;
        }

        // 2) Buscar la cuenta de trading
        const [accountRow] = await tx
          .select()
          .from(tradingAccounts)
          .where(eq(tradingAccounts.id, paymentRow.accountId));

        if (!accountRow) {
          console.error(
            "❌ Cuenta de trading no encontrada para payment.accountId =",
            paymentRow.accountId
          );
          // Opcional: marcar el payment como error
          await tx
            .update(payments)
            .set({
              status: "error_no_account",
              updatedAt: new Date(),
            })
            .where(eq(payments.id, paymentRow.id));
          return;
        }

        console.log("➡️ Cuenta encontrada:", {
          accountId: accountRow.id,
          userId: accountRow.userId,
          balanceAntes: accountRow.balance,
        });

        // 3) Calcular monto en unidades: payment.amount (int) viene en centavos
        const amountUnits = Number(paymentRow.amount) / 100; // ej: 15000 -> 150.00

        // tradingAccounts.balance es numeric(12,2) → Drizzle lo devuelve como string
        const currentBalance = Number(accountRow.balance ?? 0);
        const newBalance = currentBalance + amountUnits;

        // 4) Actualizar balance de la cuenta de trading
        await tx
          .update(tradingAccounts)
          .set({
            balance: newBalance.toFixed(2), // string "150.00"
            updatedAt: new Date(),
          })
          .where(eq(tradingAccounts.id, accountRow.id));

        console.log("💰 Balance actualizado:", {
          accountId: accountRow.id,
          balanceAntes: currentBalance,
          amount: amountUnits,
          balanceDespues: newBalance,
        });

        // 5) Registrar transacción en tabla `transactions`
        await tx.insert(transactions).values({
          id: crypto.randomUUID(),
          userId: accountRow.userId,
          type: "deposit",
          amount: amountUnits.toFixed(2), // numeric(12,2)
          currency: paymentRow.currency || "USD",
          status: "completed",
          metadata: {
            provider: "stripe",
            paymentId: paymentRow.id,
            stripeSessionId: paymentRow.stripeSessionId,
            referenceId: paymentRow.referenceId,
          },
          createdAt: new Date(),
        });

        // 6) Marcar payment como acreditado
        await tx
          .update(payments)
          .set({
            status: "paid_and_credited",
            updatedAt: new Date(),
          })
          .where(eq(payments.id, paymentRow.id));

        console.log(
          `✅ Pago acreditado y registrado. Cuenta ${accountRow.id} +${amountUnits} ${paymentRow.currency}`
        );
      });
    }

    // También estamos manejando fallos de pago por si quieres verlos
    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const referenceId = pi.metadata?.referenceId;
      console.log("❌ payment_intent.payment_failed para referencia:", referenceId);

      if (referenceId) {
        await db
          .update(payments)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(payments.referenceId, referenceId));
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("❌ Error procesando webhook:", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}
