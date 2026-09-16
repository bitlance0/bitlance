// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SessionService } from "@/modules/auth/services/SessionService";
import { UserService } from "@/modules/auth/services/UserService";

const protectedRoutes = ["/dashboard", "/profile", "/account"];
const adminRoutes = ["/admin"];
const publicOnlyRoutes = ["/sign-in", "/landing"]; // 👈 rutas que solo deben ver NO logueados

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // 🛑 Nunca interceptes /api (ni assets)
  const p = url.pathname;
  if (
    p.startsWith("/api") ||
    p.startsWith("/_next") ||
    p.startsWith("/favicon") ||
    p.startsWith("/assets") ||
    p.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("better-auth.session-token")?.value;

  if (!token) {
    // 🔹 Usuario no autenticado → bloquear rutas protegidas
    if (protectedRoutes.some((r) => url.pathname.startsWith(r))) {
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 🔹 Usuario autenticado → validar sesión
  const session = await SessionService.getSessionByToken(token);
  if (!session || !(await SessionService.isValidSession(token))) {
    const res = NextResponse.redirect(new URL("/sign-in", req.url));
    res.cookies.delete("better-auth.session-token");
    return res;
  }

  const user = await UserService.getUserById(session.userId);
  if (!user || user.status !== "active") {
    return NextResponse.redirect(new URL("/blocked", req.url));
  }

  // 🔹 Evitar que un usuario logueado vea login/landing
  if (publicOnlyRoutes.includes(url.pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 🔹 Verificar rol admin
  if (
    adminRoutes.some((r) => url.pathname.startsWith(r)) &&
    user.role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/forbidden", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|api|favicon.ico|public).*)",
  ],
};
