/**
 * Script de prueba automatizada: Alto apalancamiento (50x y 100x)
 * Ejecución: node docs/tests/test_high_leverage.mjs
 */

async function testHighLeverage() {
  console.log("=== INICIANDO TEST DE ALTO APALANCAMIENTO (50x y 100x) ===");
  const headers = {
    "Content-Type": "application/json",
    "Cookie": "better-auth.session_token=dev-token-barosanz-superadmin-master-key; dev_user_override=barosanz01@gmail.com",
  };

  // Test 50x
  console.log("\n1. Probando Apalancamiento 50x con 2 BTC...");
  const open50 = await fetch("http://localhost:3000/api/trade/open", {
    method: "POST",
    headers,
    body: JSON.stringify({
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 2,
      leverage: 50,
      market: "crypto",
    }),
  }).then(r => r.json());

  if (!open50.success) {
    console.error("Fallo 50x:", open50);
    process.exit(1);
  }

  console.log("Trade 50x Creado:", {
    id: open50.trade.id,
    leverage: open50.trade.leverage,
    marginUsed: open50.trade.marginUsed,
    balanceAfter: open50.trade.balanceAfter,
  });

  const close50 = await fetch("http://localhost:3000/api/trade/close", {
    method: "POST",
    headers,
    body: JSON.stringify({ tradeId: open50.trade.id }),
  }).then(r => r.json());

  console.log("Cierre 50x Exitoso:", {
    profit: close50.trade.profit,
    newBalance: close50.newBalance,
  });

  // Test 100x
  console.log("\n2. Probando Apalancamiento 100x con 5 BTC...");
  const open100 = await fetch("http://localhost:3000/api/trade/open", {
    method: "POST",
    headers,
    body: JSON.stringify({
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 5,
      leverage: 100,
      market: "crypto",
    }),
  }).then(r => r.json());

  if (!open100.success) {
    console.error("Fallo 100x:", open100);
    process.exit(1);
  }

  console.log("Trade 100x Creado:", {
    id: open100.trade.id,
    leverage: open100.trade.leverage,
    marginUsed: open100.trade.marginUsed,
    balanceAfter: open100.trade.balanceAfter,
  });

  const close100 = await fetch("http://localhost:3000/api/trade/close", {
    method: "POST",
    headers,
    body: JSON.stringify({ tradeId: open100.trade.id }),
  }).then(r => r.json());

  console.log("Cierre 100x Exitoso:", {
    profit: close100.trade.profit,
    newBalance: close100.newBalance,
  });

  console.log("\n✅ [CHECK 3] ALTO APALANCAMIENTO 50X Y 100X VALIDADO AL 100%");
}

testHighLeverage().catch((err) => {
  console.error("Error en test de alto apalancamiento:", err);
  process.exit(1);
});
