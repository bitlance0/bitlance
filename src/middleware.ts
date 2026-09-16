// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/dashboard", "/profile", "/account", "/admin"];
const publicOnlyRoutes = ["/sign-in", "/landing"];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const p = url.pathname;

  // 🛑 Nunca interceptar /api ni assets estáticos
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

  // 🔹 Si el token residual es el antiguo mock "dev-barosanz-token", limpiarlo y enviar a login
  if (token === "dev-barosanz-token") {
    const res = NextResponse.redirect(new URL("/sign-in", req.url));
    res.cookies.delete("better-auth.session-token");
    return res;
  }

  // 🔹 Usuario no autenticado intentando entrar a ruta protegida
  if (!token) {
    if (protectedRoutes.some((r) => url.pathname.startsWith(r))) {
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 🔹 Usuario con token intentando entrar a /sign-in o /landing
  if (publicOnlyRoutes.includes(url.pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|api|favicon.ico|public).*)",
  ],
};
