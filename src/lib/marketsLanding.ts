// src/lib/marketsLanding.ts

export const MARKETS = {
  fx: {
    label: "Forex",
  },
  indices: {
    label: "Índices",
  },
  crypto: {
    label: "Criptomonedas",
  },
  commodities: {
    label: "Commodities",
  },
  acciones: {
    label: "Acciones",
  },
  all: {
    label: "Todos",
  },
} as const;

// 🔹 Tipo técnico exacto para la API
export type MarketKey = keyof typeof MARKETS;
/*
  "fx" | "indices" | "crypto" | "commodities" | "acciones" | "all"
*/
