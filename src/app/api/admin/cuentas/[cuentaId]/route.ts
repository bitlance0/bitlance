import { NextResponse } from "next/server";
import { db } from "@/db";
import { tradingAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ cuentaId: string }> } // 👈 params es una Promise
) {
  try {
    const { cuentaId } = await ctx.params; // 👈 ahora se hace await

    if (!cuentaId) {
      return NextResponse.json(
        { error: "Falta cuentaId en la ruta" },
        { status: 400 }
      );
    }

    // Buscar la cuenta por ID
    const cuenta = await db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.id, cuentaId))
      .limit(1);

    if (!cuenta || cuenta.length === 0) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    const c = cuenta[0];

    // 🔄 Mapeo de status BD → UI
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

    // 🔄 Tipo BD → UI
    const tipo =
      c.type === "REAL"
        ? "trading"
        : c.type === "DEMO"
        ? "trading"
        : ("trading" as const);

    const badges: string[] = [];
    if (c.type === "DEMO") badges.push("DEMO");

    // 🔧 Armado del objeto final
    const response = {
      id: c.id,
      numero: c.accountNumber,
      tipo,
      moneda: c.currency,
      balance: Number(c.balance ?? 0),
      balanceDisponible: Number(c.balance ?? 0),
      estado,
      fechaCreacion: c.createdAt
        ? c.createdAt.toISOString()
        : new Date().toISOString(),
      badges,
      leverage: c.leverage,
      esPrincipal: c.isDefault,
      nombre: c.name,
      userId: c.userId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error GET /api/admin/cuentas/[cuentaId]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
