// src/app/api/cuentas/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { tradingAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const cuentas = await db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.userId, session.user.id));

    const mapped = cuentas.map((c) => {
      // Mapear status BD → status UI
      let estado: "activa" | "suspendida" | "cerrada";
      switch (c.status) {
        case "ACTIVE":
          estado = "activa";
          break;
        case "SUSPENDED":
          estado = "suspendida";
          break;
        case "CLOSED":
          estado = "cerrada";
          break;
        default:
          estado = "activa";
      }

      return {
        id: c.id,
        numero: c.accountNumber,
        tipo: "trading" as const, // por ahora todas trading reales
        moneda: c.currency,
        balance: Number(c.balance ?? 0),
        balanceDisponible: Number(c.balance ?? 0),
        estado,
        fechaCreacion: c.createdAt
          ? c.createdAt.toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        // badge DEMO solo si en BD type = 'DEMO'
        badges: c.type === "DEMO" ? ["DEMO"] : [],
      };
    });

    return NextResponse.json(mapped);
  } catch (e) {
    console.error("Error GET /api/cuentas:", e);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
