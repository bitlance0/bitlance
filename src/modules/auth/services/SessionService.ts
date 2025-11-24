// src/modules/auth/services/SessionService.ts
import { db } from "@/db";
import { session } from "@/db/schema";
import { eq } from "drizzle-orm";

export class SessionService {
  /**
   * Crear una sesión nueva
   */
  static async createSession(data: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
    location?: { country?: string; city?: string };
  }) {
    const newSession = await db
      .insert(session)
      .values({
        id: data.id,
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        location: data.location ?? null,
      })
      .returning();
    return newSession[0];
  }

  /**
   * Obtener sesión por token
   */
  static async getSessionByToken(token: string) {
    const result = await db.select().from(session).where(eq(session.token, token));
    return result[0] ?? null;
  }

  /**
   * Invalidar sesión (logout)
   */
  static async deleteSession(token: string) {
    await db.delete(session).where(eq(session.token, token));
  }

  /**
   * Verificar si sesión es válida
   */
  static async isValidSession(token: string) {
    const result = await db.select().from(session).where(eq(session.token, token));
    if (!result[0]) return false;
    return new Date(result[0].expiresAt) > new Date();
  }
}
