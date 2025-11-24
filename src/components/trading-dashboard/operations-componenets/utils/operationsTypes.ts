export type TradeMeta = {
  commission?: number | string;
  swap?: number | string;
  copiedFrom?: string;
  marginUsed?: number | string;
  [k: string]: any;
};

export type TradeStatus = "open" | "closed" | "pending";
export type TriggerRule = "gte" | "lte";

export type Trade = {
  id: string | number;
  userId?: string;
  symbol: string;
  side: "buy" | "sell";
  entryPrice: string;               // (pendiente puede venir vacío, pero lo representamos como string "")
  closePrice?: string | null;
  quantity: string;
  leverage: string;
  status: TradeStatus;
  profit?: string | null;
  metadata?: TradeMeta | string | null;
  createdAt?: string | null;
  closedAt?: string | null;

  // ⬇️ nuevos opcionales para pendientes
  triggerPrice?: string | null;
  triggerRule?: TriggerRule | null; // "gte" >= o "lte" <=
  expiresAt?: string | null;
};
