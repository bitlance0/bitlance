import { NextResponse } from "next/server";
import { runTradeEngineOnce } from "@/lib/tradeEngineRunner";
import { getActor } from "@/modules/auth/services/getActor";

function isInternalRequest(req: Request) {
  const internalKey = process.env.TRADE_ENGINE_INTERNAL_KEY?.trim();
  const headerKey = req.headers.get("x-trade-engine-key");
  if (internalKey) return headerKey === internalKey;
  if (process.env.NODE_ENV !== "production") return headerKey === "dev-local";
  return false;
}

async function run(req: Request) {
  const internal = isInternalRequest(req);

  if (internal) {
    const result = await runTradeEngineOnce();
    return NextResponse.json(result);
  }

  const actor = await getActor(req);
  if (!actor?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const result = await runTradeEngineOnce({ userId: actor.user.id });
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
