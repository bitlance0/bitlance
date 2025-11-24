import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select()
    .from(payments)
    .orderBy(desc(payments.createdAt))
    .limit(100);

  return NextResponse.json(rows);
}
