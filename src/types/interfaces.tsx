// src/types/interfaces.tsx
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
  role: string;
  status: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

export interface MarketQuote {
  symbol: string;
  price: number;
  isFavorite?: boolean;
  high?: number;
  low?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  latestTradingDay?: string;
  source?: string;
  market?: string;
  name?: string | null;
  sector?: string | null;
  logo?: string | null;
  logoFallback?: string | null;
  volume?: number | null;
  turnover?: number | null;
  ts?: number | null;
}
