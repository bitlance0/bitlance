// "use client";

import { db } from "@/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { account } from "@/db/schema";
import { headers } from "next/headers";
import { UpdatePasswordForm } from "@/modules/home/ui/views/cambiar-password/PasswordForm";

export default async function CambiarPasswordTab() {

  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;

  const userAccount = user
    ? await db.query.account.findFirst({
      where: eq(account.userId, user.id),
    })
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-yellow-500">Seguridad</h1>

      <UpdatePasswordForm hasPassword={!!userAccount?.password} />
    </div>
  );

}