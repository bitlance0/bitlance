// // src/db/index.ts
// import { drizzle } from 'drizzle-orm/postgres-js'
// import postgres from 'postgres'
// import * as schema from '@/db/schema'; // ✅ importa todo tu esquema

// const connectionString = process.env.DATABASE_URL!;

// // Disable prefetch as it is not supported for "Transaction" pool mode
// const client = postgres(connectionString, { prepare: false })
// export const db = drizzle(client, { schema });


// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

const connectionString = process.env.DATABASE_URL!;

// 🔒 Importante: activar SSL para Supabase (Render necesita esto)
const client = postgres(connectionString, {
  prepare: false,
  ssl: 'require', // <- fuerza conexión segura
});

export const db = drizzle(client, { schema });
