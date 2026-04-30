// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

const authBaseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_API_URL ||
      process.env.BETTER_AUTH_URL ||
      "http://localhost:3000";

export const authClient = createAuthClient({
  // Este proyecto monta Better Auth dentro del mismo Next.js app.
  // En cliente conviene usar siempre el origen actual para evitar
  // errores de puerto/host al trabajar en local.
  baseURL: authBaseURL,
});

// Re-exporta hooks si quieres:
export const { useSession } = authClient;
export default authClient;
