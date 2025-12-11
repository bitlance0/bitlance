
import { NextResponse } from "next/server";
import { runTradeEngineOnce } from "@/lib/tradeEngineRunner";

export async function GET() {
  const result = await runTradeEngineOnce();
  return NextResponse.json(result);
}

export async function POST() {
  const result = await runTradeEngineOnce();
  return NextResponse.json(result);
}