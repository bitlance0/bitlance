# Arquitectura y Plan de Implementación: Sistema de Apalancamiento Profesional

## 1. Visión General
El sistema de apalancamiento (*leverage*) en esta plataforma de trading ha sido diseñado bajo los estándares financieros e institucionales de plataformas como **Webtrader, MetaTrader 5 y Binance Futures**, permitiendo a los operadores maximizar su poder de compra mediante el uso controlado de **margen colateral**, manteniendo siempre la integridad de su balance y la protección frente a saldos negativos.

---

## 2. Fórmulas Financieras y Mecánica Operativa

### A. Valor Nocional de la Operación
Representa el volumen total de exposición en el mercado:
$$\text{Valor Nocional} = \text{Precio de Entrada} \times \text{Cantidad de Unidades}$$

### B. Margen Requerido (Colateral Retenido)
Cantidad de efectivo descontada del saldo disponible para respaldar la posición abierta:
$$\text{Margen Requerido} = \frac{\text{Valor Nocional}}{\text{Apalancamiento}} = \frac{\text{Precio} \times \text{Cantidad}}{\text{Leverage}}$$

### C. Poder de Compra Real (Unidades Máximas Disponibles)
Capacidad real del usuario para abrir contratos según su saldo disponible y el multiplicador seleccionado:
$$\text{Unidades Máximas} = \left\lfloor \frac{\text{Balance} \times \text{Apalancamiento}}{\text{Precio Actual}} \right\rfloor$$

### D. Ganancia o Pérdida Nominal (PnL en USD)
El beneficio o pérdida monetaria neta depende exclusivamente del movimiento del precio por el número de contratos:
$$\text{PnL} = (\text{Precio Actual} - \text{Precio de Entrada}) \times \text{Cantidad} \times \text{Dirección}$$
*donde $\text{Dirección} = +1$ para compras (LONG/BUY) y $-1$ para ventas (SHORT/SELL).*

### E. Retorno sobre el Margen Invertido (ROE %)
Porcentaje de rendimiento obtenido sobre el colateral retenido:
$$\text{ROE \%} = \frac{\text{PnL}}{\text{Margen Requerido}} \times 100$$
O de forma equivalente:
$$\text{ROE \%} = \frac{\text{Precio Actual} - \text{Precio de Entrada}}{\text{Precio de Entrada}} \times 100 \times \text{Dirección} \times \text{Apalancamiento}$$

### F. Liquidación y Cierre de Posición
- **Cierre manual o por TP/SL**:
  $$\text{Efectivo Acreditado} = \text{Margen Retenido} + \text{PnL}$$
- **Margin Call / Stop-Out Automático**:
  Si las pérdidas flotantes agotan el 95% del margen asignado a la posición ($\text{PnL} \le -0.95 \times \text{Margen Requerido}$), el motor de ejecución cierra la posición para evitar que la cuenta entre en saldo negativo.

---

## 3. Matriz de Apalancamientos por Mercado

| Mercado | Apalancamientos Permitidos | Margen Mínimo Requerido | Nivel de Riesgo |
|---|---|---|---|
| **Criptomonedas (Crypto)** | `1x, 2x, 5x, 10x, 20x, 50x, 100x` | `1.0%` (a 100x) | Alto |
| **Forex (Divisas FX)** | `1x, 5x, 10x, 20x, 50x, 100x` | `1.0%` (a 100x) | Medio-Alto |
| **Índices Bursátiles** | `1x, 5x, 10x, 20x, 50x` | `2.0%` (a 50x) | Medio |
| **Acciones / Stocks** | `1x, 2x, 5x, 10x, 20x` | `5.0%` (a 20x) | Controlado |
| **Materias Primas (Commodities)**| `1x, 2x, 5x, 10x, 20x` | `5.0%` (a 20x) | Controlado |
