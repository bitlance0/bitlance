import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";

import { db } from "@/db";
import {
  rolePermissions,
  transactions,
  user,
  userPermissions,
} from "@/db/schema";
import { getActor } from "@/modules/auth/services/getActor";
import { getUserRoleId } from "@/modules/rbac/service";

export async function GET(req: Request) {
  try {
    const actor = await getActor(req);
    if (!actor?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const adminUserId = actor.user.id;
    const roleId = await getUserRoleId(adminUserId);

    const [roleRows, userRows] = await Promise.all([
      db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId)),
      db
        .select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, adminUserId)),
    ]);

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

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? 10);
    const offset = Number(searchParams.get("offset") ?? 0);
    const q = searchParams.get("q")?.trim() || null;
    const from = searchParams.get("from") || null;
    const to = searchParams.get("to") || null;
    const tipo = searchParams.get("tipo") || null;
    const estado = searchParams.get("estado") || null;
    const accountId = searchParams.get("accountId") || null;
    const currencyFilter = searchParams.get("currency") || null;

    const whereClauses: any[] = [];

    if (q) {
      whereClauses.push(
        or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`))
      );
    }

    if (tipo === "depositos") {
      whereClauses.push(eq(transactions.type, "deposit"));
    } else if (tipo === "retiros") {
      whereClauses.push(eq(transactions.type, "withdrawal"));
    } else if (tipo === "ajustes") {
      whereClauses.push(
        ilike(transactions.metadata, '%"source":"admin_adjustment"%')
      );
    }

    if (estado && estado !== "todos") {
      whereClauses.push(
        eq(transactions.status, estado as "pending" | "completed" | "failed")
      );
    }

    if (from) {
      whereClauses.push(gte(transactions.createdAt, new Date(from)));
    }

    if (to) {
      const endDate = new Date(to);
      endDate.setDate(endDate.getDate() + 1);
      whereClauses.push(lte(transactions.createdAt, endDate));
    }

    if (accountId) {
      whereClauses.push(
        ilike(transactions.metadata, `%\"accountId\":\"${accountId}\"%`)
      );
    }

    if (currencyFilter) {
      whereClauses.push(eq(transactions.currency, currencyFilter));
    }

    const whereFinal =
      whereClauses.length > 0 ? and(...whereClauses) : undefined;

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

    const reviewedByIds = Array.from(
      new Set(
        rows
          .map((row) => {
            const metadata = (row.metadata ?? {}) as Record<string, unknown>;
            return typeof metadata.reviewedBy === "string"
              ? metadata.reviewedBy
              : null;
          })
          .filter((value): value is string => Boolean(value))
      )
    );

    const reviewedByUsers =
      reviewedByIds.length > 0
        ? await db
            .select({
              id: user.id,
              name: user.name,
              email: user.email,
            })
            .from(user)
            .where(inArray(user.id, reviewedByIds))
        : [];

    const reviewedByMap = new Map(
      reviewedByUsers.map((reviewer) => [
        reviewer.id,
        reviewer.name || reviewer.email || "Admin",
      ])
    );

    const items = rows.map((r) => {
      const metadata = (r.metadata ?? {}) as Record<string, unknown>;
      const reviewedById =
        typeof metadata.reviewedBy === "string" ? metadata.reviewedBy : null;

      return {
        id: r.id,
        userId: r.userId,
        tipo:
          r.type === "deposit"
            ? "Deposito"
            : r.type === "withdrawal"
            ? "Retiro"
            : r.type,
        monto: Number(r.amount ?? 0),
        fecha: r.createdAt?.toISOString() ?? new Date().toISOString(),
        currency: r.currency ?? "USD",
        status: r.status ?? "desconocido",
        userName: r.userName,
        userEmail: r.userEmail,
        metadata: {
          ...metadata,
          reviewedByName: reviewedById
            ? reviewedByMap.get(reviewedById) ?? null
            : null,
        },
      };
    });

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
