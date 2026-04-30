// src/app/api/admin/usuarios/[usuarioId]/cuentas/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { tradingAccounts, transactions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  context: { params: Promise<{ usuarioId: string }> }
) {
  try {
    const { usuarioId } = await context.params;

    if (!usuarioId) {
      return NextResponse.json(
        { error: "Falta usuarioId en la ruta" },
        { status: 400 }
      );
    }

    // 👇 mismas cuentas que en /api/cuentas pero filtradas por el usuarioId recibido
    const [cuentas, pendingWithdrawals] = await Promise.all([
      db
        .select()
        .from(tradingAccounts)
        .where(eq(tradingAccounts.userId, usuarioId)),
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, usuarioId),
            eq(transactions.type, "withdrawal"),
            eq(transactions.status, "pending")
          )
        ),
    ]);

    const pendingByAccount = new Map<string, number>();

    for (const row of pendingWithdrawals) {
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

      const balance = Number(c.balance ?? 0);
      const pending = pendingByAccount.get(c.id) ?? 0;

      return {
        id: c.id,
        numero: c.accountNumber,
        tipo: "trading" as const, // por ahora todas trading reales
        moneda: c.currency,
        balance,
        balanceDisponible: Math.max(0, balance - pending),
        estado,
        fechaCreacion: c.createdAt
          ? c.createdAt.toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        badges: c.type === "DEMO" ? ["DEMO"] : [],
      };
    });

    return NextResponse.json(mapped);
  } catch (e) {
    console.error("Error GET /api/admin/usuarios/[usuarioId]/cuentas:", e);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
