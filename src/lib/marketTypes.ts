// src/lib/marketTypes.ts

export interface MarketItem {
  symbol: string;
  price: number;
  latestTradingDay: string;
  source: string;
  market: string;
}

export interface RenderedMarketRow {
  symbol: string;
  price: number;
  date: string;
}

