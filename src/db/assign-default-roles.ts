// src/db/assign-default-roles.ts
import { db } from "@/db";
import { user } from "@/db/schema";
import { userRoles } from "@/db/schema";

export async function assignDefaultRoles() {
  const rows = await db.select({ id: user.id }).from(user);
  for (const u of rows) {
    await db.insert(userRoles).values({ userId: u.id, roleId: "user" }).onConflictDoNothing();
  }
}
