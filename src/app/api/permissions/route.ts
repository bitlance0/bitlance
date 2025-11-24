// src/app/api/permissions/route.ts
import { db } from "@/db";
import { permissions } from "@/db/schema";

export async function GET() {
  const data = await db.select().from(permissions);
  return Response.json(data);
}
