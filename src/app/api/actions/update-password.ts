"use server";

import { db } from "@/db";
import { account } from "@/db/schema";
import { eq } from "drizzle-orm";
import { passwordSchema } from "@/lib/validations/password";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { headers } from "next/headers"; // ✅ Import necesario

export async function updatePassword(formData: FormData) {
  // 🔹 Obtenemos headers del request actual
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) throw new Error("No hay sesión activa.");

  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { currentPassword, newPassword } = parsed.data;
  const userId = session.user.id;

  // Busca la cuenta del usuario
  const userAccount = await db.query.account.findFirst({
    where: eq(account.userId, userId),
  });

  if (!userAccount) throw new Error("Cuenta no encontrada.");

  // Caso 1: cuenta social sin contraseña -> crear nueva
  if (!userAccount.password) {
    const hashed = await bcrypt.hash(newPassword, 10);
    await db
      .update(account)
      .set({ password: hashed, providerId: "credentials" })
      .where(eq(account.id, userAccount.id));

    return { success: "Contraseña creada correctamente." };
  }

  // Caso 2: validar contraseña actual
  const isValid = await bcrypt.compare(
    currentPassword || "",
    userAccount.password
  );
  if (!isValid) return { error: { currentPassword: ["Contraseña incorrecta."] } };

  // Actualizar contraseña
  const hashed = await bcrypt.hash(newPassword, 10);
  await db
    .update(account)
    .set({ password: hashed })
    .where(eq(account.id, userAccount.id));

  return { success: "Contraseña actualizada correctamente." };
}
