// GET /api/roles
// src/app/api/roles/route.ts
import { db } from "@/db";
import { roles } from "@/db/schema";

export async function GET() {
  const data = await db.select().from(roles);
  return Response.json(data);
}
