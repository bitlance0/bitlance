// src/app/api/users/[userId]/permissions/route.ts
import { getEffectivePermissions } from "@/modules/rbac/service";

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const eff = await getEffectivePermissions(userId);
  return Response.json(eff);
}
