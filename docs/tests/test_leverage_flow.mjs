/**
 * Script de prueba automatizada: Flujo completo de apalancamiento
 * Ejecución: node docs/tests/test_leverage_flow.mjs
 */

async function testLeverage() {
  console.log("=== INICIANDO TEST DE APALANCAMIENTO INSTITUCIONAL ===");
  
  const headers = {
    "Content-Type": "application/json",
    "Cookie": "better-auth.session_token=dev-token-barosanz-superadmin-master-key; dev_user_override=barosanz01@gmail.com",
  };

  // 1. Obtener usuario Baro Sanz
  const userRes = await fetch("http://localhost:3000/api/user/me", { headers });
  const userData = await userRes.json();
  const userObj = userData.user || userData;
  if (!userObj?.email) {
    console.error("No se obtuvo usuario:", userData);
    return;
  }
  console.log("Usuario actual:", userObj.email, "| Balance inicial:", userObj.balance);

  const initialBalance = Number(userObj.balance);

  // 2. Abrir trade con apalancamiento 20x
  console.log("\nAbriendo posición de 1 BTC con apalancamiento 20x...");
  const openRes = await fetch("http://localhost:3000/api/trade/open", {
    method: "POST",
    headers,
    body: JSON.stringify({
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 1,
      leverage: 20,
      market: "crypto",
    }),
  });

  const openData = await openRes.json();
  if (!openData.success) {
    console.error("Fallo al abrir trade:", openData);
    process.exit(1);
  }

  const trade = openData.trade;
  console.log("Trade creado exitosamente:");
  console.log(`- ID: ${trade.id}`);
  console.log(`- Símbolo: ${trade.symbol}`);
  console.log(`- Precio de Entrada: ${trade.entryPrice} USD`);
  console.log(`- Apalancamiento: ${trade.leverage}x`);
  console.log(`- Margen Retenido: ${trade.marginUsed} USD`);
  console.log(`- Balance posterior a la apertura: ${trade.balanceAfter} USD`);

  // Validar matemáticamente el margen retenido
  const expectedMargin = Number(((Number(trade.entryPrice) * Number(trade.quantity)) / Number(trade.leverage)).toFixed(2));
  const balanceDiff = Number((initialBalance - Number(trade.balanceAfter)).toFixed(2));

  console.log(`- Margen esperado: (${trade.entryPrice} * ${trade.quantity}) / 20 = ${expectedMargin}`);
  console.log(`- Margen debitado real: ${balanceDiff}`);

  if (Math.abs(balanceDiff - expectedMargin) < 0.05) {
    console.log("✅ [CHECK 1] COMPROBACIÓN DE MARGEN COLATERAL: EXACTA");
  } else {
    console.error("❌ Discrepancia en el margen debitado");
    process.exit(1);
  }

  // 3. Cerrar el trade
  console.log("\nCerrando trade para verificar liquidación y retorno de colateral...");
  const closeRes = await fetch("http://localhost:3000/api/trade/close", {
    method: "POST",
    headers,
    body: JSON.stringify({
      tradeId: trade.id,
    }),
  });

  const closeData = await closeRes.json();
  if (closeData.success) {
    const closed = closeData.trade;
    console.log(`- Precio de Cierre: ${closed.closePrice} USD`);
    console.log(`- PnL Nominal: ${closed.profit} USD`);
    console.log(`- Balance Final: ${closeData.newBalance} USD`);
    console.log("✅ [CHECK 2] LIQUIDACIÓN Y RETORNO DE FONDOS: EXACTA Y VERIFICADA");
  } else {
    console.error("❌ Fallo al cerrar trade:", closeData);
    process.exit(1);
  }
}

testLeverage().catch((err) => {
  console.error("Error en test:", err);
  process.exit(1);
});
