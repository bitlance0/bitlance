// src/app/api/user/historial/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, tradingAccounts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getActor } from "@/modules/auth/services/getActor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Operacion = {
  id: string;
  simbolo: string;
  tipo: string;
  estado: string;
  cantidad: number;
  precio: number;
  total: number;
  cuenta: string;
  fecha: string;
  profitLoss?: number;
};

type Movimiento = {
  id: string;
  tipo: string;
  monto: number;
  fecha: string;
  operaciones: Operacion[];
};

export async function GET(req: Request) {
  try {
    // 1) Usuario de la sesión
    const actor = await getActor(req);
    if (!actor?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const userId = actor.user.id;

    // 2) Transacciones del usuario
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(200); // puedes ajustar el límite

    // 3) Cache simple de nombres de cuenta
    const accountNamesCache = new Map<string, string>();

    async function getAccountName(accountId?: string | null) {
      if (!accountId) return "Cuenta de trading";
      if (accountNamesCache.has(accountId)) {
        return accountNamesCache.get(accountId)!;
      }
      const [acc] = await db
        .select()
        .from(tradingAccounts)
        .where(eq(tradingAccounts.id, accountId));
      const name = acc ? acc.name ?? "Cuenta de trading" : "Cuenta de trading";
      accountNamesCache.set(accountId, name);
      return name;
    }

    // 4) Agrupar por cabecera: tipoMovimiento + fecha (YYYY-MM-DD)
    const movimientos: Movimiento[] = [];
    const indexByKey = new Map<string, number>();

    for (const row of rows) {
      const meta = (row.metadata ?? {}) as any;
      const baseAmount = Number(row.amount ?? 0);

      // signo del movimiento
      let signedAmount = baseAmount;
      if (row.type === "withdrawal") {
        signedAmount = -baseAmount;
      } else if (meta.direction === "CARGO") {
        signedAmount = -baseAmount;
      }

      // etiqueta del movimiento
      let tipoMovimiento = "Movimiento";
      if (row.type === "deposit") tipoMovimiento = "Depósito";
      else if (row.type === "withdrawal") tipoMovimiento = "Retiro";
      else if (row.type === "transfer") tipoMovimiento = "Transferencia";
      else if (row.type === "trade") tipoMovimiento = "Operación de trading";

      const estado =
        row.status === "completed"
          ? "completada"
          : row.status === "pending"
          ? "pendiente"
          : "procesado";

      const fechaCabecera = row.createdAt
        ? row.createdAt.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      const cuentaName = await getAccountName(
        meta.accountId ?? meta.account_id
      );

      const operacion: Operacion = {
        id: row.id,
        simbolo:
          meta.symbol ??
          meta.simbolo ??
          (row.type === "deposit"
            ? "Depósito"
            : row.type === "withdrawal"
            ? "Retiro"
            : "Movimiento"),
        tipo:
          meta.tipo ??
          (row.type === "deposit"
            ? "deposito"
            : row.type === "withdrawal"
            ? "retiro"
            : row.type === "trade"
            ? meta.side ?? "trade"
            : "cargo"),
        estado,
        cantidad: meta.quantity ?? meta.cantidad ?? 1,
        precio: meta.price ?? meta.precio ?? baseAmount,
        total: baseAmount,
        cuenta: cuentaName,
        fecha: row.createdAt
          ? row.createdAt.toISOString()
          : new Date().toISOString(),
        profitLoss: meta.profit ?? meta.profitLoss ?? undefined,
      };

      // 🔑 clave de agrupación: tipoMovimiento + fecha
      const key = `${tipoMovimiento}__${fechaCabecera}`;

      if (indexByKey.has(key)) {
        // ya existe cabecera → sumar monto y añadir operación
        const idx = indexByKey.get(key)!;
        movimientos[idx].monto += signedAmount;
        movimientos[idx].operaciones.push(operacion);
      } else {
        // nueva cabecera
        const nuevoMovimiento: Movimiento = {
          id: row.id, // o key, si prefieres
          tipo: tipoMovimiento,
          monto: signedAmount,
          fecha: fechaCabecera,
          operaciones: [operacion],
        };
        movimientos.push(nuevoMovimiento);
        indexByKey.set(key, movimientos.length - 1);
      }
    }

    return NextResponse.json({ movimientos });
  } catch (e) {
    console.error("Error GET /api/user/historial:", e);
    return NextResponse.json(
      { error: "Error interno al cargar historial" },
      { status: 500 }
    );
  }
}
