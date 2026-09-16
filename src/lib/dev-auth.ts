// src/lib/dev-auth.ts
/**
 * Configuración de desarrollo para auto-autenticación y privilegios completos de Baro Sanz
 */

export const BAROSANZ_USER = {
  id: "CRTm53DehWzFmGowUtCfm08WoN1VeVGT",
  name: "Baro Sanz",
  email: "barosanz01@gmail.com",
  emailVerified: true,
  image: "https://lh3.googleusercontent.com/a/ACg8ocKUSh0m2DKt0VjlSdRFtLlR97YQTxZYMbUSWSlKlE_RHQuxK3BO=s96-c",
  role: "admin" as const,
  status: "active" as const,
  balance: "10000.00",
  preferences: { theme: "dark", notifications: true },
  createdAt: new Date("2025-12-07T15:04:51.097Z"),
  updatedAt: new Date(),
};

export const BAROSANZ_SESSION = {
  id: "dev-session-barosanz",
  token: "dev-barosanz-token",
  userId: "CRTm53DehWzFmGowUtCfm08WoN1VeVGT",
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
};

export const ALL_PERMISSIONS: Record<string, boolean> = {
  trading_operate: true,
  trading_high_limit: true,
  market_crypto: true,
  analysis_advanced_charts: true,
  reports_detailed: true,
  support_user_assist: true,
  support_view_tickets: true,
  admin_user_mgmt: true,
  admin_balance_mgmt: true,
  admin2_assign_perms: true,
  admin2_system_config: true,
  admin2_view_logs: true,
  payments_gateways_toggle: true,
};

export const DEV_SESSION_TOKEN = "dev-barosanz-token";

export interface DevTradeRecord {
  id: string;
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  orderType: string;
  entryPrice: string;
  closePrice: string | null;
  quantity: string;
  leverage: string;
  status: "open" | "closed" | "pending";
  takeProfit: string | null;
  stopLoss: string | null;
  triggerPrice?: string | null;
  triggerRule?: string | null;
  createdAt: string;
  updatedAt?: string;
  metadata?: any;
}

const g = globalThis as unknown as {
  __devTrades?: DevTradeRecord[];
  __devUserBalance?: number;
};

if (!g.__devTrades) {
  g.__devTrades = [];
}
if (typeof g.__devUserBalance !== "number") {
  g.__devUserBalance = 10000.00;
}

export const devTradeStore = {
  getBalance: (_userId?: string) => {
    return g.__devUserBalance ?? 10000.00;
  },
  setBalance: (newBalance: number) => {
    g.__devUserBalance = Number(newBalance.toFixed(2));
    BAROSANZ_USER.balance = g.__devUserBalance.toFixed(2);
    return g.__devUserBalance;
  },
  debit: (amount: number) => {
    const current = devTradeStore.getBalance();
    if (current < amount) return null;
    return devTradeStore.setBalance(current - amount);
  },
  credit: (amount: number) => {
    const current = devTradeStore.getBalance();
    return devTradeStore.setBalance(current + amount);
  },
  getTrades: (_userId?: string, status?: string) => {
    const all = g.__devTrades ?? [];
    if (!status || status === "all") return all;
    return all.filter((t) => t.status === status);
  },
  getTradeById: (id: string) => {
    return (g.__devTrades ?? []).find((t) => t.id === id) || null;
  },
  addTrade: (t: DevTradeRecord) => {
    if (!g.__devTrades) g.__devTrades = [];
    g.__devTrades.unshift(t);
    return t;
  },
  updateTrade: (id: string, updates: Partial<DevTradeRecord>) => {
    const trade = (g.__devTrades ?? []).find((t) => t.id === id);
    if (!trade) return null;
    Object.assign(trade, updates);
    return trade;
  },
};
