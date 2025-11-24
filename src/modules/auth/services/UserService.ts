// src/modules/auth/services/UserService.ts
import { db } from "@/db";
import { user, transactions, tradingAccounts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

// Helper universal para UUID (Edge y Node)
function genUUID(): string {
  // Web Crypto disponible en Edge y también en Node 18+ como globalThis.crypto
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback muy simple si por alguna razón no existe (no debería ocurrir en Edge)
  return `${Date.now().toString(16)}-${Math.random()
    .toString(16)
    .slice(2, 10)}-${Math.random().toString(16).slice(2, 10)}`;
}

/**
 * Genera un número de cuenta legible y pseudo-único por usuario.
 * Ejemplo: BL-ABC123-0001
 */
function generateAccountNumber(userId: string, index: number = 1): string {
  const shortId = userId.replace(/-/g, "").slice(0, 6).toUpperCase();
  const padded = String(index).padStart(4, "0");
  return `BL-${shortId}-${padded}`;
}

export class UserService {
  static async createUser(data: {
    id: string;
    name: string;
    email: string;
    role?: "user" | "admin" | "collaborator";
  }) {
    // 1) Crear el usuario
    const [newUser] = await db
      .insert(user)
      .values({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role ?? "user",
      })
      .returning();

    // 2) Crear cuenta de trading estándar asociada
    const accountNumber = generateAccountNumber(newUser.id, 1);

    await db.insert(tradingAccounts).values({
      id: genUUID(),
      userId: newUser.id,
      accountNumber,
      name: "Cuenta estándar",
      type: "REAL",      // tipo de cuenta
      status: "ACTIVE",  // activa por defecto
      isDefault: true,   // marcar como cuenta principal
      currency: "USD",   // divisa base
      leverage: 100,     // apalancamiento 1:100
      balance: "0.00",   // saldo inicial 0
    });

    return newUser;
  }

  static async getUserById(userId: string) {
    const result = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    return result[0] ?? null;
  }

  static async getUserByEmail(email: string) {
    const result = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    return result[0] ?? null;
  }

  static async updateRole(
    userId: string,
    role: "user" | "admin" | "collaborator"
  ) {
    await db.update(user).set({ role }).where(eq(user.id, userId));
  }

  static async updateStatus(
    userId: string,
    status: "active" | "inactive" | "banned"
  ) {
    await db.update(user).set({ status }).where(eq(user.id, userId));
  }

  static async adjustBalance(
    userId: string,
    amount: number,
    type: "deposit" | "withdrawal" | "transfer" | "trade"
  ): Promise<any> {
    const amountStr = amount.toFixed(2);

    const newTransaction: InferInsertModel<typeof transactions> = {
      id: genUUID(), // ✅ Edge-safe
      userId: String(userId),
      type,
      amount: amountStr,
      status: "completed",
    };

    const trx = await db.insert(transactions).values(newTransaction).returning();

    await db
      .update(user)
      .set({
        balance: sql`(COALESCE(${user.balance}::numeric, 0) + ${amount})::numeric`,
      })
      .where(eq(user.id, userId));

    return trx[0];
  }

  static async getTransactions(userId: string) {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId));
  }
}
