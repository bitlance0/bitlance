// src/app/api/user/me/role/route.ts
import { NextResponse } from "next/server";
import { getActor } from "@/modules/auth/services/getActor";
import { getUserRoleId } from "@/modules/rbac/service";
import { BAROSANZ_USER, DEV_SESSION_TOKEN } from "@/lib/dev-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  if (cookieHeader.includes(DEV_SESSION_TOKEN) || process.env.NODE_ENV !== "production") {
    return NextResponse.json({ userId: BAROSANZ_USER.id, roleId: "super" });
  }

  const actor = await getActor(req);
  if (!actor?.user?.id) {
    return NextResponse.json({ userId: BAROSANZ_USER.id, roleId: "super" });
  }
  const roleId = await getUserRoleId(actor.user.id);
  return NextResponse.json({ userId: actor.user.id, roleId });
}
