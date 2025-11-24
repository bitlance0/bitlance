// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

// Verificamos que la variable de entorno exista antes de usarla
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "❌ DATABASE_URL no está definida. Por favor, configura tu variable de entorno en un archivo .env o en tu sistema."
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl, // Usamos la variable verificada
  },
  verbose: true,
  strict: true,
});
