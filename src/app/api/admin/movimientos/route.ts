// src/app/api/admin/movimientos/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  transactions,
  user,
  rolePermissions,
  userPermissions,
} from "@/db/schema";
import {
  desc,
  eq,
  ilike,
  and,
  or,
  gte,
  lte,
} from "drizzle-orm";
import { getActor } from "@/modules/auth/services/getActor";
import { getUserRoleId } from "@/modules/rbac/service";

export async function GET(req: Request) {
  try {
    // ----------- Auth ----------
    const actor = await getActor(req);
    if (!actor?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const adminUserId = actor.user.id;
    const roleId = await getUserRoleId(adminUserId);

    // permisos del admin
    const roleRows = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    const userRows = await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, adminUserId));

    const permissions: Record<string, boolean> = {};

    for (const p of roleRows) {
      if (p.type === "mandatory") permissions[p.permissionId] = true;
      else if (p.type === "blocked") permissions[p.permissionId] = false;
    }
    for (const u of userRows) {
      permissions[u.permissionId] = u.allow;
    }

    const canView =
      permissions["admin_balance_mgmt"] ||
      permissions["admin_user_mgmt"] ||
      permissions["admin2_view_logs"];

    if (!canView) {
      return NextResponse.json(
        { error: "No tienes permisos para ver estos movimientos" },
        { status: 403 }
      );
    }

    // ----------- Query Params ----------
    const { searchParams } = new URL(req.url);

    const limit = Number(searchParams.get("limit") ?? 10);
    const offset = Number(searchParams.get("offset") ?? 0);

    const q = searchParams.get("q")?.trim() || null;
    const from = searchParams.get("from") || null;
    const to = searchParams.get("to") || null;
    const tipo = searchParams.get("tipo") || null;
    const estado = searchParams.get("estado") || null;

    // ✔ NUEVOS FILTROS
    const accountId = searchParams.get("accountId") || null;
    const currencyFilter = searchParams.get("currency") || null;

    // ----------- WHERE dinámico ----------
    const whereClauses: any[] = [];

    // filtro por nombre o email (q)
    if (q) {
      whereClauses.push(
        or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`))
      );
    }

    // filtro por tipo
    if (tipo === "depositos") {
      whereClauses.push(eq(transactions.type, "deposit"));
    } else if (tipo === "retiros") {
      whereClauses.push(eq(transactions.type, "withdrawal"));
    } else if (tipo === "ajustes") {
      whereClauses.push(
        ilike(transactions.metadata, '%"source":"admin_adjustment"%')
      );
    }

    // filtro por estado
    if (estado && estado !== "todos") {
      whereClauses.push(eq(transactions.status, estado as "pending" | "completed" | "failed"));
    }

    // rango de fechas
    if (from) {
      whereClauses.push(gte(transactions.createdAt, new Date(from)));
    }

    if (to) {
      const endDate = new Date(to);
      endDate.setDate(endDate.getDate() + 1);
      whereClauses.push(lte(transactions.createdAt, endDate));
    }

    // ✔ NUEVO: filtrar por ID de cuenta
    if (accountId) {
      whereClauses.push(
        ilike(transactions.metadata, `%\"accountId\":\"${accountId}\"%`)
      );
    }

    // ✔ NUEVO: filtrar por moneda
    if (currencyFilter) {
      whereClauses.push(eq(transactions.currency, currencyFilter));
    }

    const whereFinal =
      whereClauses.length > 0 ? and(...whereClauses) : undefined;

    // ----------- Query Movimientos ----------
    const rows = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        type: transactions.type,
        amount: transactions.amount,
        currency: transactions.currency,
        status: transactions.status,
        metadata: transactions.metadata,
        createdAt: transactions.createdAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(transactions)
      .leftJoin(user, eq(transactions.userId, user.id))
      .where(whereFinal)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    const items = rows.map((r) => ({
      id: r.id,
      tipo:
        r.type === "deposit"
          ? "Depósito"
          : r.type === "withdrawal"
          ? "Retiro"
          : r.type,
      monto: Number(r.amount ?? 0),
      fecha: r.createdAt?.toISOString() ?? new Date().toISOString(),
      currency: r.currency ?? "USD",
      status: r.status ?? "desconocido",
      userName: r.userName,
      userEmail: r.userEmail,
      metadata: r.metadata ?? {},
    }));

    return NextResponse.json({
      items,
      nextOffset: offset + rows.length,
      hasMore: rows.length === limit,
    });
  } catch (err) {
    console.error("Error GET /api/admin/movimientos:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
