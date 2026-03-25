// src/lib/marketTypes.ts
export interface MarketItem {
  symbol: string;
  price: number;
  latestTradingDay: string;
  source: string;
  market: string;
  volume?: number | null;
  turnover?: number | null;
  ts?: number | null;
}

export interface RenderedMarketRow {
  symbol: string;
  price: number;
  date: string;
}