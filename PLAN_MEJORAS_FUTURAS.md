# 🎯 PLAN DE MEJORAS FUTURAS

## Fase 3: Optimizaciones Recomendadas

### 1. **Implementar reintentos con backoff exponencial**
**Para:** Alpha Vantage API calls en `/api/alpha-markets`

```typescript
// Pseudo-código
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (e) {
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await sleep(delay);
    }
  }
}
```

---

### 2. **Monitoreo y alertas de Redis**
**Para:** Detectar cuándo Redis está down en producción

```typescript
// En cada endpoint que usa Redis
try {
  const health = await redis.ping();
  if (!health) throw "Redis unreachable";
} catch (e) {
  console.error('🚨 REDIS ALERT:', e);
  // Enviar alerta a Slack/log
}
```

---

### 3. **Pre-caching periódico de mercados**
**Para:** Evitar latencia en primer request

```typescript
// Crear un job que se ejecute cada 5 minutos
setInterval(async () => {
  for (const market of Object.keys(SYMBOLS_MAP)) {
    try {
      const data = await fetch(`/api/markets?market=${market}`);
      // Automáticamente cachea
    } catch (e) {
      console.warn(`Pre-cache failed for ${market}:`, e);
    }
  }
}, 5 * 60000);
```

---

### 4. **Rate limiting inteligente para Alpha Vantage**
**Para:** No exceder límites de API

```typescript
// Implementar cola de requests
const requestQueue = [];
const MAX_REQUESTS_PER_MINUTE = 5;
let lastRequestTime = 0;

async function queuedFetch(symbol) {
  while (requestQueue.length >= MAX_REQUESTS_PER_MINUTE) {
    await sleep(1000);
  }
  return await fetchFromAlpha(symbol);
}
```

---

### 5. **Separar endpoints: datos reales vs simulados**
**Para:** Mayor flexibilidad

```
/api/markets              → retorna datos simulados (actual)
/api/markets/real         → retorna datos reales de Alpha Vantage
/api/markets/cached       → solo busca en caché sin timeout
```

---

### 6. **Metricas y observabilidad**
**Para:** Entender qué está pasando en producción

```typescript
// Agregar métricas
const metrics = {
  'api.markets.cache_hit': 127,
  'api.markets.cache_miss': 34,
  'api.markets.error_count': 2,
  'redis.connection_errors': 5,
};

// Enviar a Datadog/New Relic cada minuto
```

---

### 7. **Testing e2e de mercados**
**Para:** Detectar problemas antes que usuarios

```typescript
// test/markets.e2e.test.ts
describe("Markets API", () => {
  it("should return valid quotes for all markets", async () => {
    for (const market of Object.keys(SYMBOLS_MAP)) {
      const res = await fetch(`/api/markets?market=${market}`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      data.forEach(quote => {
        expect(quote.symbol).toBeDefined();
        expect(quote.price).toBeGreaterThan(0);
      });
    }
  });
});
```

---

### 8. **Documentación API**
**Para:** Que otros desarrolladores sepan cómo usar

```markdown
## GET /api/markets

Retorna lista de precios simulados para un mercado.

### Parámetros
- `market`: uno de [indices, acciones, crypto, fx, commodities]

### Respuesta
```json
[
  {
    "symbol": "BTC",
    "price": 90056,
    "high": 95903.57,
    "low": 90294.95,
    "source": "simulated"
  }
]
```

### Notas
- Los precios son **simulados** en tiempo real
- Para precios **reales**, usar `/api/alpha-markets`
- Cache se guarda en memoria + Redis (si disponible)
```

---

### 9. **Validación exhaustiva en entrada/salida**
**Para:** Detectar datos inválidos temprano

```typescript
// Schema validation con Zod
import { z } from 'zod';

const QuoteSchema = z.object({
  symbol: z.string().min(1),
  price: z.number().positive(),
  high: z.number().optional(),
  market: z.enum(['crypto', 'indices', 'acciones', 'fx', 'commodities']).optional(),
});

const ResponseSchema = z.array(QuoteSchema);

export async function GET(req) {
  // ... fetch data
  const validated = ResponseSchema.parse(data);
  return NextResponse.json(validated);
}
```

---

### 10. **Dashboard de salud**
**Para:** Monitorear estado del sistema

```
GET /health → {
  "status": "healthy",
  "redis": "connected",
  "markets": {
    "indices": true,
    "crypto": true,
    "fx": true
  },
  "uptime": "23h 45m",
  "lastAlphaVantageCall": "2025-03-03T10:45:00Z"
}
```

---

## Roadmap de Implementación

### Sprint 1 (Semana 1-2):
- [ ] Implementar reintentos con backoff
- [ ] Agregar pre-caching periódico
- [ ] Escribir tests e2e

### Sprint 2 (Semana 3-4):
- [ ] Separar endpoints (real vs simulado)
- [ ] Agregar validación con Zod
- [ ] Dashboard de salud

### Sprint 3 (Producción):
- [ ] Implementar metricas/observabilidad
- [ ] Rate limiting robusto
- [ ] Documentación completa API

---

## Checklist de Verificación

Antes de desplegar a producción:

- [ ] Todos los endpoints responden con códigos correctos
- [ ] Trade-engine procesando órdenes correctamente
- [ ] Redis connectivity verificado
- [ ] Tests e2e pasando
- [ ] Performance aceptable (<2s por request típico)
- [ ] Logging detallado funcionando
- [ ] Documentación API completada
- [ ] Plan de rollback definido

