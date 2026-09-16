// src/app/api/user/me/route.ts
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 👇 Aquí buscamos al usuario real en la tabla `user`
  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id));

  if (!dbUser) {
    return new Response("User not found", { status: 404 });
  }

  // Devolvemos los datos actualizados de la DB
  return Response.json(dbUser);
}

// ✅ PATCH: actualizar usuario actual
export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();

  // Aquí podrías agregar validación server-side también si lo deseas
  const updated = await db
    .update(user)
    .set({
      name: body.name,
      // email: body.email,
      // status: body.status,
    })
    .where(eq(user.id, session.user.id))
    .returning();

  return Response.json(updated[0]);
}