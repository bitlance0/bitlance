// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { createDefaultRealAccountForUser } from "@/modules/trading/services/TradingAccountService";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    emailVerification: false, // 👈 Desactiva temporalmente la verificación
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirectTo: "/", // 👈 aquí fuerzas que vaya directo al home
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...schema },
  }),

  databaseHooks: {
    user: {
      create: {
        // Se ejecuta DESPUÉS de que BetterAuth crea el registro en la tabla `user`
        async after(newUser) {
          try {
            await createDefaultRealAccountForUser(newUser.id);
          } catch (e) {
            console.error(
              "Error creando cuenta estándar para nuevo usuario:",
              e
            );
            // No lanzamos error para no romper el sign up
          }
        },
      },
    },
  },
});
