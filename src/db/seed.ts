// src/db/seed.ts
import "dotenv/config";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { seedRBAC } from "./seed-rbac";

async function main() {
  console.log("🌱 Seeding RBAC…");
  console.log("🔌 DATABASE_URL =", (process.env.DATABASE_URL || "").slice(0, 80) + "...");

  // 🔎 Diagnóstico de conexión y search_path/schema
  const diag = await db.execute(sql.raw(`
    select
      current_database() as db,
      current_user as usr,
      current_schema() as sch,
      current_setting('search_path', true) as search_path
  `));
  // @ts-ignore
  console.log("🧭 Conn:", diag.rows?.[0]);

  // 🔎 Verifica que las tablas existen (en este mismo connection/schema)
  const exists = await db.execute(sql.raw(`
    select
      (select to_regclass('public.roles') is not null) as roles_ok,
      (select to_regclass('public.permissions') is not null) as permissions_ok,
      (select to_regclass('public.role_permissions') is not null) as role_permissions_ok
  `));
  // @ts-ignore
  console.log("📦 Tables:", exists.rows?.[0]);

  await seedRBAC(); // 👈 Aquí debe ejecutar SÍ o SÍ

  console.log("✅ Seed RBAC terminado.");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed error:", e);
  process.exit(1);
});
