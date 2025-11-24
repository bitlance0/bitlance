// src/app/api/trading-accounts/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { tradingAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Falta userId en query (?userId=...)" },
        { status: 400 }
      );
    }

    const cuentas = await db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.userId, userId));

    // Puedes formatear si quieres, pero así ya sirve bien para el front
    return NextResponse.json(
      cuentas.map((c) => ({
        id: c.id,
        accountNumber: c.accountNumber,
        name: c.name,
        currency: c.currency,
        balance: c.balance,
        status: c.status,
        isDefault: c.isDefault,
      }))
    );
  } catch (error) {
    console.error("Error al obtener cuentas de trading:", error);
    return NextResponse.json(
      { error: "Error al obtener cuentas de trading" },
      { status: 500 }
    );
  }
}
