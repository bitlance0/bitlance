# Sistema de Control de Peticiones Simultáneas

## Problema Resuelto

Anteriormente, múltiples componentes hacían peticiones simultáneas al mismo endpoint `/api/markets`, causando:
- Overhead innecesario en servidor y cliente
- Requests cancelados y duplicados
- Inconsistencias en el estado
- Desperdicio de cuota de API externa

## Solución Implementada

### 1. **Fetcher Centralizado** (`src/lib/marketFetcher.ts`)

Sistema de deduplicación automática que garantiza:
- ✅ **Solo 1 request activo por mercado** a la vez
- ✅ Múltiples llamadas al mismo endpoint **comparten la misma promesa**
- ✅ Limpieza automática de requests antiguos (>1min)
- ✅ Timeout de 30s por request
- ✅ Cancelación controlada con AbortController

```typescript
// Si dos componentes llaman esto simultáneamente:
await fetchMarketData('indices'); // Request real
await fetchMarketData('indices'); // Reutiliza la promesa del primero
```

### 2. **Store Simplificado** (`src/stores/useMarketStore.ts`)

- ✅ Eliminado manejo manual de AbortController
- ✅ Usa `fetchMarketData()` centralizado
- ✅ Método `cleanup()` para liberar recursos al desmontar
- ✅ Versionado de requests para ignorar respuestas obsoletas

### 3. **Componente Optimizado** (`src/components/TradingDashboard.tsx`)

- ✅ **Eliminado polling duplicado**: Solo usa el del store
- ✅ Cleanup automático al desmontar
- ✅ Single source of truth para datos de mercado

## Cómo Verificar que Funciona

### En el Panel Network del Navegador:

**❌ ANTES:**
```
markets?market=indices  (pending)
markets?market=indices  (canceled)
markets?market=indices  (canceled)
markets?market=indices  200
```

**✅ AHORA:**
```
markets?market=indices  200
```

### Logs en Consola:

Busca mensajes como:
```
[marketFetcher] Reusing inflight request for indices
```

Esto confirma que el sistema está **deduplicando correctamente**.

## API del Fetcher

### Funciones Exportadas:

```typescript
// Fetch con deduplicación automática
await fetchMarketData(market: string, options?: {
  force?: boolean;      // Forzar nuevo request
  signal?: AbortSignal; // Cancelación externa
})

// Cancelar requests
cancelMarketRequest(market: string)
cancelAllMarketRequests()

// Verificar estado
isMarketRequestInFlight(market: string): boolean

// Debugging
getMarketFetcherStats() // { activeRequests, requests[] }
purgeStaleRequests()    // Limpia y retorna stats
```

## Configuración

### Timeouts y Límites:

En `src/lib/marketFetcher.ts`:

```typescript
const REQUEST_TIMEOUT = 30000;    // Timeout por request
const STALE_THRESHOLD = 60000;    // Limpiar requests >1min
```

### Intervalo de Polling:

En `src/components/TradingDashboard.tsx`:

```typescript
const intervalId = setInterval(() => {
  fetchMarket(marketToFetch);
}, 20_000); // ← Ajustar aquí (20 segundos)
```

## Debugging

### Ver requests activos en consola del navegador:

```javascript
// En DevTools Console:
const stats = (await import('/src/lib/marketFetcher')).getMarketFetcherStats();
console.table(stats.requests);
```

### Forzar refresh ignorando caché:

```javascript
const { fetchMarketData } = await import('/src/lib/marketFetcher');
await fetchMarketData('crypto', { force: true });
```

## Mejoras Futuras (Opcionales)

1. **Rate Limiting cliente**: Limitar máx requests/minuto
2. **Exponential backoff**: Esperar más tras errores consecutivos
3. **Request batching**: Combinar múltiples mercados en 1 request
4. **Service Worker**: Caché persistente offline-first
5. **WebSocket**: Reemplazar SSE por conexión bidireccional

## Monitoreo Recomendado

- **Network tab**: Verificar que no hay requests duplicados/cancelados
- **Console**: Buscar warnings de timeout o abort
- **Performance**: Reducción de ~60-80% en requests tras implementación
