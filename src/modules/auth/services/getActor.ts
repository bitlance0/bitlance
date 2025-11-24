// src/modules/auth/getActor.ts
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // tu export real (BetterAuth/NextAuth/Lucia/custom)

export type Actor = { user: { id: string; role?: string } } | null;

export async function getActor(req?: Request): Promise<Actor> {
  // 0) Bypass opcional en desarrollo (útil para pruebas)
  if (process.env.RBAC_DEV_ACTOR_ID) {
    return { user: { id: process.env.RBAC_DEV_ACTOR_ID, role: "super" } };
  }

  const cookieHeader =
    req?.headers.get("cookie") ??
    (await cookies()).toString() ?? // next/headers
    (await headers()).get("cookie") ?? "";

  try {
    // 1) Better Auth estilo: auth.api.getSession({ headers })
    if ((auth as any)?.api?.getSession) {
      const session = await (auth as any).api.getSession({
        headers: { cookie: cookieHeader },
      });
      return session ?? null;
    }

    // 2) NextAuth estilo: auth() o getServerSession(req,res)
    if (typeof (auth as any) === "function") {
      const session = await (auth as any)(); // muchas integraciones leen cookies implícitamente
      return session ?? null;
    }
    if ((auth as any)?.getSession) {
      const session = await (auth as any).getSession({ headers: { cookie: cookieHeader } });
      return session ?? null;
    }

    // 3) Lucia/otros: validateRequest({ headers })
    if ((auth as any)?.validateRequest) {
      const session = await (auth as any).validateRequest({
        headers: { cookie: cookieHeader },
      });
      return session ?? null;
    }
  } catch {
    // noop → devolvemos null
  }
  return null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
