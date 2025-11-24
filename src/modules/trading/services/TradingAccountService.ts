// src/modules/trading/services/TradingAccountService.ts
import { db } from "@/db";
import { tradingAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export type TradingAccountType =
  | "REAL"
  | "DEMO"
  | "INVEST"
  | "PRACTICE"
  | "VIP"
  | "FUTURES"
  | "SPOT";

export type TradingAccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "CLOSED";

function genUUID(): string {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random()
    .toString(16)
    .slice(2, 10)}-${Math.random().toString(16).slice(2, 10)}`;
}

/**
 * Divide el user.id (sin guiones) en bloques de 6 chars.
 * Ej: "uq4y3cVagC1dLt7QTjtkNsUXwwydhhYQ" =>
 * ["uq4y3c","VagC1d","Lt7QTj","tkNsUX","wwydhh","YQ"]
 */
function getUserIdChunks(userId: string): string[] {
  const clean = userId.replace(/-/g, "");
  const chunks: string[] = [];

  for (let i = 0; i + 6 <= clean.length; i += 6) {
    chunks.push(clean.slice(i, i + 6));
  }

  if (chunks.length === 0 && clean.length > 0) {
    chunks.push(clean.slice(0, 6));
  }

  return chunks;
}

/** Mapea tipo → letra oculta en el número de cuenta */
function getAccountTypePrefix(type: TradingAccountType): string {
  switch (type) {
    case "REAL":
      return "R";
    case "DEMO":
      return "D";
    case "INVEST":
      return "I";
    case "PRACTICE":
      return "P";
    case "VIP":
      return "V";
    case "FUTURES":
      return "F";
    case "SPOT":
      return "S";
    default:
      return "R";
  }
}

/**
 * Genera un candidato de número de cuenta:
 * BL-RABCDE1234
 *   BL-   → BitLance
 *   R     → tipo (Real, Demo, etc.)
 *   ABCDE → 5 chars del userId
 *   1234  → 4 dígitos aleatorios
 */
function generateAccountNumberCandidate(
  userId: string,
  type: TradingAccountType
): string {
  const chunks = getUserIdChunks(userId);
  const baseRaw =
    chunks.length > 0
      ? chunks[Math.floor(Math.random() * chunks.length)]
      : "BITLAN";

  const base = baseRaw.toUpperCase().padEnd(5, "X").slice(0, 5);
  const random4 = Math.floor(1000 + Math.random() * 9000); // 1000–9999
  const prefix = getAccountTypePrefix(type);

  return `BL-${prefix}${base}${random4}`;
}

/**
 * Genera un número de cuenta único verificando contra la BD.
 */
async function generateUniqueAccountNumber(
  userId: string,
  type: TradingAccountType
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateAccountNumberCandidate(userId, type);

    const existing = await db
      .select({ id: tradingAccounts.id })
      .from(tradingAccounts)
      .where(eq(tradingAccounts.accountNumber, candidate))
      .limit(1);

    if (existing.length === 0) return candidate;
  }

  const prefix = getAccountTypePrefix(type);
  return `BL-${prefix}${Date.now().toString(16).toUpperCase()}`;
}

/**
 * Servicio genérico para crear una cuenta de trading.
 * Lo usaremos tanto en el hook de registro como en endpoints de admin.
 */
export async function createTradingAccountForUser(options: {
  userId: string;
  type: TradingAccountType;
  name?: string;
  isDefault?: boolean;
  currency?: string;
  leverage?: number;
  initialBalance?: number | string;
  status?: TradingAccountStatus;
}) {
  const {
    userId,
    type,
    name = "Cuenta estándar",
    isDefault = false,
    currency = "USD",
    leverage = 100,
    initialBalance = "0.00",
    status = "ACTIVE",
  } = options;

  const accountNumber = await generateUniqueAccountNumber(userId, type);

  const [account] = await db
    .insert(tradingAccounts)
    .values({
      id: genUUID(),
      userId,
      accountNumber,
      name,
      type,
      status,
      isDefault,
      currency,
      leverage,
      balance:
        typeof initialBalance === "number"
          ? initialBalance.toFixed(2)
          : initialBalance,
    })
    .returning();

  return account;
}

/**
 * Helper específico para la cuenta REAL estándar al registrarse.
 */
export async function createDefaultRealAccountForUser(userId: string) {
  return createTradingAccountForUser({
    userId,
    type: "REAL",
    name: "Cuenta estándar",
    isDefault: true,
    currency: "USD",
    leverage: 100,
    initialBalance: "0.00",
    status: "ACTIVE",
  });
}
