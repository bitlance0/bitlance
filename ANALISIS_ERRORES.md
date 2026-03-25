# Análisis Completo del Proyecto - Errores Identificados

## 🔴 PROBLEMAS CRÍTICOS ENCONTRADOS

### 1. **API /api/markets - Conflicto de lógica**
**Ubicación:** `src/app/api/markets/route.ts`

**Problema:**
- Existe una confusión arquitectónica entre dos enfoques diferentes:
  - El archivo usa `fetchCrypto()` que hace llamadas unitarias a Alpha Vantage por símbolo
  - Pero también usa `fetchMarket()` para obtener un lote de símbolos
  - El código intenta reutilizar `isFresh()` y `simulate()` que son para un flujo diferente

**Impacto:**
```
❌ Cuando solicita /api/markets?market=crypto, el servidor:
1. Intenta llamar a fetchCrypto() para CADA símbolo cripto (BTC, ETH, LTC, etc.)
2. Alpha Vantage usa 5 créditos por llamada → se agota rápidamente
3. get_finance_all() nunca funciona correctamente
4. El fallback a mock no se dispara correctamente
```

**Root cause:**
- No hay una estrategia clara de cómo manejar múltiples símbolos vs símbolos individuales
- Falta diferenciación entre `/api/markets?market=X` (múltiples símbolos) vs consultas individuales

---

### 2. **Inconsistencia en la estructura de datos - Candles**
**Ubicación:** `src/app/api/alpha-candles/route.ts`

**Problema:**
- El tipo `Candle` no tiene el campo `source` pero sí está siendo usado
- Hay inconsistencia en cómo se parsean fechas (epoch vs ISO)
- El cache usa claves que incluyen muchos parámetros lo que puede causar ineficacia
- No hay validación de que los datos de Alpha sean válidos antes de retornarlos

**Error específico:**
```typescript
// Línea 141: parseAlphaSeries retorna Candle[] pero
// el Candle type no tiene todos los campos que podrían necesitarse
const parseAlphaSeries(json: any, interval: string, isFx: boolean): Candle[] {
  // ... código que parsea sin validar estructura
}
```

---

### 3. **Problemas del trade-engine.ts**
**Ubicación:** `src/trade-engine.ts`

**Problemas:**
1. **URL mal configurada:**
   ```typescript
   const MARKET_URL = `${APP_BASE_URL}/api/markets?market=all`;
   // ❌ Pero /api/markets NO soporta ?market=all
   // El SYMBOLS_MAP tiene: 'fx', 'indices','acciones','commodities','crypto'
   // ❌ "all" NO existe en SYMBOLS_MAP
   ```

2. **Lógica de mercado fallida:**
   - La función `marketOfSymbol()` retorna siempre "acciones" por defecto
   - Esto causa que órdenes FX se cierren basadas en precios de acciones

3. **Falta de manejo de errores:**
   - Si `fetchPrices()` falla, retorna un Map vacío sin loguear
   - Esto causa que todas las órdenes se queden en "pendiente" indefinidamente

---

### 4. **Datos incompletos en mockData.ts**
**Ubicación:** `src/lib/mockData.ts`

**Problema:**
- Símbolos duplicados en crypto (SOL, XRP aparecen dos veces)
- Símbolos en mockData NO coinciden exactamente con los de SYMBOLS_MAP
  - mockData: META, SOL, XRP
  - SYMBOLS_MAP: FB (debería ser META), no tiene SOL/XRP directamente como símbolos dinámicos en todas las categorías

---

### 5. **Redis fallback ineficiente**
**Ubicación:** `src/app/api/alpha-candles/route.ts` y `src/app/api/markets/route.ts`

**Problema:**
- Si Redis falla, no hay fallback a memoria local
- Si Redis está down, TODA la API se comporta lentamente
- El error de Redis se loguea pero se ignora silenciosamente

---

### 6. **Manejo de rate limiting incompleto**
**Ubicación:** `src/app/api/markets/route.ts` línea 188

**Problema:**
- Solo marca `alphaBlockedUntil` cuando hay `json.Note` (rate limit explícito)
- Pero Alpha Vantage también retorna errores sin `Note` cuando está rate limitado
- El timeout de 30s es muy agresivo y puede causar timeouts falsos
- No hay reintentos con backoff exponencial

---

### 7. **Falta de validación en symbolsMap**
**Ubicación:** `src/lib/symbolsMap.ts` y múltiples APIs

**Problema:**
- El SYMBOLS_MAP no está siendo usado consistentemente
- Los componentes del frontend pueden pedir símbolos no permitidos
- No hay un validador centralizado

---

## 📊 PROBLEMAS POR SEVERIDAD

### 🔴 CRÍTICO (Bloquea funcionalidad)
1. `/api/markets` falla al consultar múltiples símbolos → crypto, acciones, etc. no funcionan
2. `trade-engine` usa `?market=all` que no existe → las órdenes no se procesan
3. `getCachedData` en candles retorna tipo incorrecto

### 🟠 ALTO (Degrada experiencia)
4. Duplicados en mockData
5. Redis fallback sin manejo
6. Rate limiting incompleto
7. Inconsistencia en estructuras de datos

### 🟡 MEDIO (Problemas potenciales)
8. Validación de symbolsMap inconsistente
9. Errores de fetch sin detalles en logs
10. Timestamps en diferentes formatos

---

## ✅ PLAN DE CORRECCIÓN

### Fase 1: Arreglar APIs críticas (URGENTE)
1. [ ] Refactorizar `/api/markets` para diferenciar entre obtener un mercado completo vs símbolos específicos
2. [ ] Cambiar `/api/markets` para usar `/api/alpha-markets` como backend
3. [ ] Arreglar `trade-engine.ts` para usar listado válido de mercados
4. [ ] Validar symbolsMap globalmente

### Fase 2: Consolidar datos y cache
5. [ ] Limpiar duplicados en mockData
6. [ ] Unificar tipos (Quote, MarketQuote, Candle)
7. [ ] Mejorar fallback de Redis
8. [ ] Arreglar tipos de retorno en candles

### Fase 3: Mejorar resiliencia
9. [ ] Implementar reintentos con backoff
10. [ ] Mejorar rate limiting
11. [ ] Añadir validación exhaustiva en entrada/salida
12. [ ] Logging detallado de errores en APIs

