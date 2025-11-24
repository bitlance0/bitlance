// src/app/api/user/me/role/route.ts
import { NextResponse } from "next/server";
import { getActor } from "@/modules/auth/services/getActor";
import { getUserRoleId } from "@/modules/rbac/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const actor = await getActor(req);
  if (!actor?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roleId = await getUserRoleId(actor.user.id);
  return NextResponse.json({ userId: actor.user.id, roleId });
}
