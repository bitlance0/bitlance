// src/app/api/auth/send-verification/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { user, verification } from "@/db/schema";
import { eq } from "drizzle-orm";
import { addHours } from "date-fns";
import { generateToken, hashToken, sendVerificationEmail } from "@/lib/email-verification";

// export const dynamic = "force-dynamic"; // necesario para Node runtime

// Rate limit simple (en memoria). En producción usa Redis o Supabase.
const memoryRL = new Map<string, number>(); // key=ip/email, value=timestamp

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email)
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });

    // 🧠 Rate limit por IP + email
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const key = `${ip}:${email}`;
    const last = memoryRL.get(key) || 0;
    if (Date.now() - last < 60_000 * 2) {
      return NextResponse.json(
        { error: "Espera 2 minutos para reintentar" },
        { status: 429 }
      );
    }
    memoryRL.set(key, Date.now());

    // 🔍 Buscar usuario
    const [u] = await db.select().from(user).where(eq(user.email, email));
    if (!u)
      return NextResponse.json({ error: "Usuario no existe" }, { status: 404 });

    // ⚡ Si ya está verificado, responde mensaje explícito
    if (u.emailVerified) {
      return NextResponse.json({
        ok: true,
        message:
          "El correo electrónico ya fue verificado. Puedes iniciar sesión sin problema.",
      });
    }

    // 🧹 Limpia verificaciones anteriores
    await db.delete(verification).where(eq(verification.identifier, email));

    // 🔐 Crear token y guardar hash
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = addHours(new Date(), 24);

    await db.insert(verification).values({
      id: crypto.randomUUID(),
      identifier: email,
      value: tokenHash,
      expiresAt,
    });

    // 🌐 URL base (usa APP_URL, no API_URL)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(
      rawToken
    )}&email=${encodeURIComponent(email)}`;

    // ✉️ Enviar correo
    await sendVerificationEmail({ to: email, verifyUrl });

    return NextResponse.json({
      ok: true,
      message: "Correo de verificación enviado correctamente.",
    });
  } catch (e) {
    console.error("Error en send-verification:", e);
    return NextResponse.json(
      { error: "No se pudo enviar el correo" },
      { status: 500 }
    );
  }
}
