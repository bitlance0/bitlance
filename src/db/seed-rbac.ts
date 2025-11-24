// src/db/seed-rbac.ts
import { db } from "@/db";
import { sql } from "drizzle-orm";
// ⚠️ IMPORTA las tablas desde donde REALMENTE se exportan.
// Si usas el "barrel" en src/db/schema/index.ts, deja "@/db/schema".
// Si no tienes barrel, importa desde el archivo que las define.
import { roles, permissions, rolePermissions } from "@/db/schema";

type RoleId = "user" | "collaborator" | "admin" | "super";
type PermType = "mandatory" | "optional" | "blocked";

async function count(tableName: string) {
  const r = await db.execute(sql.raw(`select count(*)::int as c from ${tableName}`));
  // @ts-ignore
  return Number(r.rows?.[0]?.c ?? 0);
}

export async function seedRBAC() {
  console.log("🔧 Iniciando seed RBAC…");

  // --- Conteos iniciales
  const before = {
    roles: await count("public.roles"),
    permissions: await count("public.permissions"),
    role_permissions: await count("public.role_permissions"),
  };
  console.log("📊 BEFORE:", before);

  // 1) Roles
  const roleRows = [
    { id: "user",         name: "Usuario",       level: "1" },
    { id: "collaborator", name: "Colaborador",   level: "2" },
    { id: "admin",        name: "Administrador", level: "3" },
    { id: "super",        name: "Super",         level: "4" },
  ] as const;

  for (const r of roleRows) {
    await db.insert(roles).values(r as any).onConflictDoNothing();
  }
  console.log("✅ Roles insertados (onConflictDoNothing).");

  // 2) Permisos catálogo (slugs)
  const P = {
    trading_operate:           { id: "trading_operate", name: "Operar",               category: "trading",  description: "Realizar operaciones" },
    trading_high_limit:        { id: "trading_high_limit", name: "Límite Alto",       category: "trading",  description: "Montos elevados" },
    market_crypto:             { id: "market_crypto", name: "Mercado Cripto",         category: "trading",  description: "Acceso a cripto" },

    analysis_advanced_charts:  { id: "analysis_advanced_charts", name: "Gráficos Avanzados", category: "analysis", description: "Herramientas técnicas" },
    reports_detailed:          { id: "reports_detailed", name: "Reportes",            category: "analysis", description: "Reportes detallados" },

    support_user_assist:       { id: "support_user_assist", name: "Soporte a Usuarios", category: "support", description: "" },
    support_view_tickets:      { id: "support_view_tickets", name: "Ver Tickets",     category: "support", description: "" },

    admin_user_mgmt:           { id: "admin_user_mgmt", name: "Gestión de Usuarios",  category: "admin",   description: "" },
    admin_balance_mgmt:        { id: "admin_balance_mgmt", name: "Gestión de Saldos", category: "admin",   description: "" },

    admin2_assign_perms:       { id: "admin2_assign_perms", name: "Asignar/Modificar Permisos", category: "admin2", description: "" },
    admin2_system_config:      { id: "admin2_system_config", name: "Configuración del Sistema", category: "admin2", description: "" },
    admin2_view_logs:          { id: "admin2_view_logs", name: "Ver Logs",           category: "admin2", description: "" },

    payments_gateway:          { id: "payments_gateway", name: "Pasarela de Pagos",   category: "payments", description: "Configurar y gestionar la pasarela de pagos" },
  } as const;

  // Inserta uno a uno para que, si un enum/category falla, lo veamos en el log
  for (const perm of Object.values(P)) {
    await db.insert(permissions).values(perm as any).onConflictDoNothing();
  }
  console.log("✅ Permisos insertados (onConflictDoNothing).");

  // 3) Matriz por rol
  await upsertRoleMatrix("user", {
    [P.trading_operate.id]:          "mandatory",
    [P.trading_high_limit.id]:       "optional",
    [P.market_crypto.id]:            "optional",

    [P.analysis_advanced_charts.id]: "blocked",
    [P.reports_detailed.id]:         "blocked",

    [P.support_user_assist.id]:      "blocked",
    [P.support_view_tickets.id]:     "blocked",

    [P.admin_user_mgmt.id]:          "blocked",
    [P.admin_balance_mgmt.id]:       "blocked",

    [P.admin2_assign_perms.id]:      "blocked",
    [P.admin2_system_config.id]:     "blocked",
    [P.admin2_view_logs.id]:         "blocked",

    [P.payments_gateway.id]:         "blocked",
  });

  await upsertRoleMatrix("collaborator", {
    [P.trading_operate.id]:          "mandatory",
    [P.trading_high_limit.id]:       "optional",
    [P.market_crypto.id]:            "optional",

    [P.analysis_advanced_charts.id]: "optional",
    [P.reports_detailed.id]:         "optional",

    [P.support_user_assist.id]:      "optional",
    [P.support_view_tickets.id]:     "optional",

    [P.admin_user_mgmt.id]:          "optional",
    [P.admin_balance_mgmt.id]:       "optional",

    [P.admin2_assign_perms.id]:      "blocked",
    [P.admin2_system_config.id]:     "blocked",
    [P.admin2_view_logs.id]:         "blocked",

    [P.payments_gateway.id]:         "blocked",
  });

  await upsertRoleMatrix("admin", {
    [P.trading_operate.id]:          "mandatory",
    [P.trading_high_limit.id]:       "optional",
    [P.market_crypto.id]:            "optional",

    [P.analysis_advanced_charts.id]: "optional",
    [P.reports_detailed.id]:         "optional",

    [P.support_user_assist.id]:      "optional",
    [P.support_view_tickets.id]:     "optional",

    [P.admin_user_mgmt.id]:          "optional",
    [P.admin_balance_mgmt.id]:       "optional",

    [P.admin2_assign_perms.id]:      "mandatory",
    [P.admin2_system_config.id]:     "mandatory",
    [P.admin2_view_logs.id]:         "mandatory",

    [P.payments_gateway.id]:         "optional", // backend aplica regla "solo SUPER" para togglear
  });

  await upsertRoleMatrix("super", {
    [P.trading_operate.id]:          "mandatory",
    [P.trading_high_limit.id]:       "mandatory",
    [P.market_crypto.id]:            "mandatory",

    [P.analysis_advanced_charts.id]: "mandatory",
    [P.reports_detailed.id]:         "mandatory",

    [P.support_user_assist.id]:      "mandatory",
    [P.support_view_tickets.id]:     "mandatory",

    [P.admin_user_mgmt.id]:          "mandatory",
    [P.admin_balance_mgmt.id]:       "mandatory",

    [P.admin2_assign_perms.id]:      "mandatory",
    [P.admin2_system_config.id]:     "mandatory",
    [P.admin2_view_logs.id]:         "mandatory",

    [P.payments_gateway.id]:         "mandatory",
  });

  // --- Conteos finales
  const after = {
    roles: await count("public.roles"),
    permissions: await count("public.permissions"),
    role_permissions: await count("public.role_permissions"),
  };
  console.log("📈 AFTER:", after);
  console.log("Δ Inserted:", {
    roles: after.roles - before.roles,
    permissions: after.permissions - before.permissions,
    role_permissions: after.role_permissions - before.role_permissions,
  });

  console.log("✅ RBAC seed OK.");
}

async function upsertRoleMatrix(roleId: RoleId, map: Record<string, PermType>) {
  const rows = Object.entries(map).map(([permissionId, type]) => ({ roleId, permissionId, type }));
  for (const r of rows) {
    await db.insert(rolePermissions).values(r as any).onConflictDoUpdate({
      target: [rolePermissions.roleId, rolePermissions.permissionId],
      set: { type: r.type },
    });
  }
  console.log(`  ↳ matriz ${roleId} aplicada (${rows.length})`);
}
