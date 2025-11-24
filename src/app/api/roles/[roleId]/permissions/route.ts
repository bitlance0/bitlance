// src/app/api/roles/[roleId]/permissions/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rolePermissions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await ctx.params;
  const rows = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId as any));
  const map: Record<string, "mandatory" | "optional" | "blocked"> = {};
  rows.forEach((r: any) => (map[r.permissionId] = r.type));
  return NextResponse.json(map);
}
