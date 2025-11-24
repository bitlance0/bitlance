// src/app/api/users/[userId]/permissions/sync/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { userPermissions, rolePermissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserRoleId, canTogglePayments } from "@/modules/rbac/service";
import { getActor, unauthorized } from "@/modules/auth/services/getActor";

export const runtime = "nodejs";

const BodySchema = z.object({
  roleId: z.enum(["user", "collaborator", "admin", "super"]),
  state: z.record(z.string(), z.boolean()),
});

export async function PUT(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await ctx.params;

    const actor = await getActor(req);          // 👈 ahora con req
    if (!actor?.user?.id) return unauthorized();

    const actorRole = await getUserRoleId(actor.user.id);
    if (actorRole !== "admin" && actorRole !== "super") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Bad Request", detail: parsed.error.flatten() }, { status: 400 });
    }
    const { roleId, state } = parsed.data;

    if ("payments_gateway" in state) {
      const can = await canTogglePayments(actor.user.id);
      if (!can) delete (state as any)["payments_gateway"];
    }

    const rows = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    const typeByPerm: Record<string, "mandatory" | "optional" | "blocked"> = {};
    rows.forEach((r: any) => (typeByPerm[r.permissionId] = r.type));

    const overrides: { permissionId: string; allow: boolean }[] = [];
    for (const [permId, checked] of Object.entries(state)) {
      if (typeByPerm[permId] === "optional") overrides.push({ permissionId: permId, allow: !!checked });
    }

    await db.transaction(async (tx) => {
      await tx.delete(userPermissions).where(eq(userPermissions.userId, userId));
      for (const ov of overrides) {
        await tx.insert(userPermissions).values({ userId, permissionId: ov.permissionId, allow: ov.allow });
      }
    });

    return NextResponse.json({ ok: true, overrides: overrides.length });
  } catch (e: any) {
    console.error("[permissions/sync] error:", e);
    return NextResponse.json({ error: "Internal Server Error", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
