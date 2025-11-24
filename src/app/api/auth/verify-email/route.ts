// src/app/api/auth/verify-email/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { user, verification } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { hashToken } from "@/lib/email-verification";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const base = process.env.NEXT_PUBLIC_API_URL || "/";
  const okRedirect = `${base}/verified?status=ok&email=${encodeURIComponent(email || "")}`;
  const failRedirect = `${base}/verified?status=invalid&email=${encodeURIComponent(email || "")}`;

  if (!token || !email) return NextResponse.redirect(failRedirect);

  try {
    const tokenHash = hashToken(token);
    const now = new Date();

    const rows = await db
      .select()
      .from(verification)
      .where(and(eq(verification.identifier, email), eq(verification.value, tokenHash), gt(verification.expiresAt, now)));

    if (rows.length === 0) return NextResponse.redirect(failRedirect);

    await db.update(user).set({ emailVerified: true }).where(eq(user.email, email));
    await db.delete(verification).where(and(eq(verification.identifier, email), eq(verification.value, tokenHash)));

    return NextResponse.redirect(okRedirect);
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(failRedirect);
  }
}
