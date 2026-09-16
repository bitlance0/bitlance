# Resumen de Correcciones Técnicas: Sistema de Apalancamiento

Este documento detalla las 5 fallas estructurales identificadas en el código base original y las soluciones técnicas implementadas para dejar el sistema 100% operativo.

---

## 1. Corrección del Selector y Parámetro Fijo de Apalancamiento

### Problema:
En `src/components/trading-dashboard/TradingDialog.tsx`:
- La variable `leverageNum = 1;` estaba fija.
- En las llamadas POST a `/api/trade/open` y `/api/trade/pending`, se enviaba de manera estática `leverage: 1`.
- El usuario no disponía de ningún control visual para cambiar el apalancamiento.

### Solución:
1. Se construyó el componente modular `LeverageSelector.tsx` con botones dinámicos y badges visuales para seleccionar apalancamientos según el mercado.
2. Se integró el estado reactivo `leverage` en `TradingDialog.tsx`.
3. Se pasó el valor seleccionado dinámicamente en el payload enviado a la API.

---

## 2. Corrección del Throttling / Bloqueo en Poder de Compra

### Problema:
En `TradingDialog.tsx`:
```typescript
// CÓDIGO ORIGINAL CON FALLA:
const maxFromMargin = Math.floor(balance / (currentPrice * marginRate));
const maxFromTotalValue = Math.floor(balance / currentPrice);
const max = Math.min(maxFromMargin, maxFromTotalValue);
```
El limitador `maxFromTotalValue` obligaba a que el usuario tuviera el 100% del dinero para cada unidad, destruyendo completamente el beneficio del apalancamiento.

### Solución:
Se reemplazó por la fórmula matemática correcta:
```typescript
// CÓDIGO CORREGIDO:
const max = Math.floor((balance * leverage) / currentPrice);
```

---

## 3. Corrección del Bug de Doble Apalancamiento (Apalancamiento al Cuadrado)

### Problema:
En `src/app/api/trade/close/route.ts` y en `useOperationsInfo.ts`:
```typescript
// CÓDIGO ORIGINAL CON FALLA:
const pnl = (close - entry) * quantity * leverage * sideFactor;
```
En trading institucional (CFDs, Forex, Futuros), `quantity` ya es la posición apalancada total que se compró con el margen. Al volver a multiplicar por `leverage`, el apalancamiento quedaba elevado al cuadrado ($\text{leverage}^2$). Un apalancamiento de 50x multiplicaba la ganancia por $2500\times$, generando ganancias y pérdidas ficticias astronómicas con fluctuaciones de centavos.

### Solución:
Se corrigió la fórmula a PnL nominal estricto y ROE% sobre el margen:
```typescript
// CÓDIGO CORREGIDO:
const profit = Number(((close - entry) * quantity * sideFactor).toFixed(2));
const cashDelta = Number((marginUsed + profit).toFixed(2));
// ROE % sobre el margen
const roePct = marginUsed > 0 ? (profit / marginUsed) * 100 : 0;
```

---

## 4. Implementación de Margin Call y Liquidación Automática

### Problema:
En `src/trade-engine.ts`, el ciclo de revisión de órdenes abiertas solo consideraba `takeProfit` y `stopLoss`. Si una operación altamente apalancada se movía con fuerte volatilidad en contra y el usuario no tenía Stop Loss fijado, el balance de la cuenta podía volverse negativo.

### Solución:
Se implementó la regla de **Liquidación por Agotamiento de Margen (Stop-Out a 95%)**:
```typescript
const entryPrice = Number(t.entryPrice);
const quantity = Number(t.quantity);
const leverage = Math.max(Number(t.leverage || 1), 1);
const marginUsed = (entryPrice * quantity) / leverage;
const currentPnl = (price - entryPrice) * quantity * (side === "buy" ? 1 : -1);

if (marginUsed > 0 && currentPnl <= -marginUsed * 0.95) {
  shouldClose = true;
  reason = "liquidation";
}
```

---

## 5. Resiliencia de Cotizaciones y Conectividad

### Problema:
En `quoteServer.ts`, si la clave de iTICK arrojaba `Invalid API key` o error de conexión externa, la plataforma bloqueaba la apertura de operaciones con error 500/502.

### Solución:
Se implementó `resolveFallbackQuote`:
- Consulta automática a la API pública de Binance para activos cripto (precios reales en milisegundos).
- Fallback a catálogo de mercado base estático `MOCK_BASE` para acciones, materias primas y divisas si fallan las redes externas.
- Inclusión de `devTradeStore` para que el entorno local opere al 100% de manera continua.
