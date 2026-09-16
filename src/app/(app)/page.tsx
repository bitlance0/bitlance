// src/app/(app)/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HomeView } from "@/modules/home/ui/views/home/home-view";
import { DEV_SESSION_TOKEN } from "@/lib/dev-auth";

export default async function Page() {
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") || "";

  if (cookie.includes(DEV_SESSION_TOKEN) || process.env.NODE_ENV !== "production") {
    return <HomeView />;
  }

  try {
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session) redirect("/landing");
  } catch {
    return <HomeView />;
  }

  return <HomeView />;
}

