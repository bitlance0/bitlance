import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { payments, tradingAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic"; // evita problemas de pre-render/SSG

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      amount,         // en centavos
      currency,       // "usd", "cop", etc.
      referenceId,    // referencia interna
      description,
      customerEmail,
      accountId,      // ID de tradingAccounts.id
      userId,         // opcional: para validar dueño de la cuenta
    } = body;

    if (!amount || !currency || !referenceId || !accountId) {
      return NextResponse.json(
        {
          error:
            "Faltan campos requeridos (amount, currency, referenceId, accountId)",
        },
        { status: 400 }
      );
    }

    // 1) Validar que la cuenta exista y esté activa
    const [account] = await db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.id, accountId));

    if (!account) {
      return NextResponse.json(
        { error: "Cuenta de trading no encontrada" },
        { status: 404 }
      );
    }

    if (account.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `La cuenta no está activa (estado: ${account.status})` },
        { status: 400 }
      );
    }

    // (Opcional) Validar que el userId del body coincida con la cuenta
    if (userId && userId !== account.userId) {
      return NextResponse.json(
        { error: "La cuenta no pertenece al usuario indicado" },
        { status: 403 }
      );
    }

    // 2) URL base para success / cancel
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_APP_URL;

    if (
      !baseUrl ||
      (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://"))
    ) {
      console.error("❌ URL base inválida:", baseUrl);
      return NextResponse.json(
        {
          error:
            "Config error: NEXT_PUBLIC_API_URL / NEXT_PUBLIC_APP_URL debe incluir http:// o https://",
        },
        { status: 500 }
      );
    }

    // 3) Crear sesión de Checkout en Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount, // ya viene en centavos
            product_data: {
              name: description || `Depósito a cuenta ${account.accountNumber}`,
            },
          },
        },
      ],
      success_url: `${baseUrl}/pagos/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pagos/cancelled`,
      customer_email: customerEmail,
      metadata: {
        referenceId,
        accountId,
        userId: account.userId,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe no devolvió URL de checkout" },
        { status: 500 }
      );
    }

    // 4) Registrar el payment en tu tabla
    await db.insert(payments).values({
      id: randomUUID(),
      stripeSessionId: session.id,
      stripeUrl: session.url,
      amount,
      currency,
      referenceId,
      status: "pending",
      customerEmail: customerEmail ?? null,
      accountId: account.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("❌ Error creando checkout:", err);
    return NextResponse.json(
      { error: "Error creando checkout", details: err.message },
      { status: 500 }
    );
  }
}
