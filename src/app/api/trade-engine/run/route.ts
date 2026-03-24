import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { runTradeEngineOnce } from "@/lib/tradeEngineRunner";
import { getActor } from "@/modules/auth/services/getActor";

function isInternalRequest(req: Request) {
  const internalKey = process.env.TRADE_ENGINE_INTERNAL_KEY?.trim();
  const headerKey = req.headers.get("x-trade-engine-key");
  if (internalKey) return headerKey === internalKey;
  if (process.env.NODE_ENV !== "production") return headerKey === "dev-local";
  return false;
}

async function isPrivilegedActor(actorId: string) {
  const [row] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, actorId));

  return row?.role === "admin";
}

async function run(req: Request) {
  const internal = isInternalRequest(req);

  if (!internal) {
    const actor = await getActor(req);
    if (!actor?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const privileged = await isPrivilegedActor(actor.user.id);
    if (!privileged) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  const result = await runTradeEngineOnce();
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
