import "dotenv/config";
import { runTradeEngineOnce } from "@/lib/tradeEngineRunner";

const ENGINE_INTERVAL_MS = Number(process.env.TRADE_ENGINE_INTERVAL_MS ?? 5000);
const ENGINE_ENABLED = process.env.TRADE_ENGINE_ENABLED !== "false";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function engineLoop() {
  console.log("trade-engine iniciado. Intervalo:", ENGINE_INTERVAL_MS, "ms");

  if (!ENGINE_ENABLED) {
    console.log("TRADE_ENGINE_ENABLED=false -> motor deshabilitado.");
    return;
  }

  while (true) {
    const started = Date.now();

    try {
      const result = await runTradeEngineOnce();
      const scanned = result.pending.scanned + result.open.scanned;
      const activated = result.pending.activated;
      const closed = result.open.closed;

      if (scanned > 0 || activated > 0 || closed > 0) {
        console.log(
          `trade-engine ciclo: pendientes=${result.pending.scanned} activadas=${activated} abiertas=${result.open.scanned} cerradas=${closed}`
        );
      }
    } catch (error) {
      console.error("trade-engine ciclo con error:", error);
    }

    const elapsed = Date.now() - started;
    const wait = Math.max(500, ENGINE_INTERVAL_MS - elapsed);
    await sleep(wait);
  }
}

if (require.main === module) {
  engineLoop().catch((error) => {
    console.error("trade-engine fallo fatal:", error);
    process.exit(1);
  });
}
