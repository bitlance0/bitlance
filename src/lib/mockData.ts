// lib/mockData.ts
export type Quote = {
  symbol: string;
  price: number;
  high?: number;
  low?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  latestTradingDay?: string;
};

/* ---------------------- Fallback mock (estático base) ---------------------- */
export const MOCK_BASE: Record<string, Quote[]> = {
  indices: [
    { symbol: "SPY", price: 665.67, high: 673.71, low: 662.17, previousClose: 671.93, change: -6.26, changePercent: -0.9316, latestTradingDay: new Date().toISOString() },
    { symbol: "QQQ", price: 611.45, high: 615.0, low: 599.87, previousClose: 608.4, change: 3.05, changePercent: 0.5013, latestTradingDay: new Date().toISOString() },
    { symbol: "DIA", price: 470.6, high: 472.05, low: 468.87, previousClose: 471.8, change: -1.2, changePercent: -0.2543, latestTradingDay: new Date().toISOString() },
  ],
  acciones: [
    { symbol: "AAPL", price: 272.83, high: 272.82, low: 265.73, previousClose: 272.41, change: 0.42, changePercent: 0.1542, latestTradingDay: new Date().toISOString() },
    { symbol: "MSFT", price: 272.83, high: 272.82, low: 265.73, previousClose: 272.41, change: 0.42, changePercent: 0.1542, latestTradingDay: new Date().toISOString() },
    { symbol: "TSLA", price: 507.49, high: 512.12, low: 504.92, previousClose: 510.18, change: -2.69, changePercent: -0.5273, latestTradingDay: new Date().toISOString() },
    { symbol: "NFLX", price: 507.49, high: 512.12, low: 504.92, previousClose: 510.18, change: -2.69, changePercent: -0.5273, latestTradingDay: new Date().toISOString() },
    { symbol: "GOOGL", price: 289.05, high: 293.95, low: 283.57, previousClose: 276.41, change: 12.64, changePercent: 4.5729, latestTradingDay: new Date().toISOString() },
    { symbol: "META", price: 289.05, high: 293.95, low: 283.57, previousClose: 276.41, change: 12.64, changePercent: 4.5729, latestTradingDay: new Date().toISOString() },
    { symbol: "AMZN", price: 232.87, high: 234.6, low: 229.19, previousClose: 234.69, change: -1.82, changePercent: -0.7755, latestTradingDay: new Date().toISOString() },
  ],
  commodities: [
    { symbol: "GLD", price: 375.96, high: 403.3, low: 236.13, previousClose: 375.96, change: 0.0, changePercent: 0.0, latestTradingDay: new Date().toISOString() },
    { symbol: "USO", price: 71.5, high: 71.9573, low: 71.13, previousClose: 69.85, change: 1.65, changePercent: 2.3622, latestTradingDay: new Date().toISOString() },
    { symbol: "SLV", price: 45.47, high: 46.705, low: 45.4, previousClose: 47.42, change: -1.95, changePercent: -4.1122, latestTradingDay: new Date().toISOString() },
  ],
  crypto: [
    { symbol: "BTC", price: 90056, high: 95903.57, low: 90294.95, previousClose: 95333.4, change: -5277.4, changePercent: -5.5357, latestTradingDay: new Date().toISOString() },
    { symbol: "ETH", price: 3031.48, high: 3223.38, low: 2946.56, previousClose: 3031.48, change: 0, changePercent: 0, latestTradingDay: new Date().toISOString() },
    { symbol: "SOL", price: 132.96, high: 142.4, low: 133.92, previousClose: 135.5, change: -2.54, changePercent: -1.8745, latestTradingDay: new Date().toISOString() },
    { symbol: "XRP", price: 2.15, high: 2.291353, low: 2.11505, previousClose: 2.15, change: 0, changePercent: 0, latestTradingDay: new Date().toISOString() },
    { symbol: "SOL", price: 132.96, high: 142.4, low: 133.92, previousClose: 135.5, change: -2.54, changePercent: -1.8745, latestTradingDay: new Date().toISOString() },
    { symbol: "XRP", price: 2.15, high: 2.291353, low: 2.11505, previousClose: 2.15, change: 0, changePercent: 0, latestTradingDay: new Date().toISOString() }
  ],

  fx: [
    { symbol: "EURUSD", price: 1.15922, high: 1.1596, low: 1.1585, previousClose: 1.1592, change: 0, changePercent: 0, latestTradingDay: new Date().toISOString() },
    { symbol: "USDJPY", price: 155.26, high: 155.38, low: 155.11, previousClose: 155.26, change: 0, changePercent: 0, latestTradingDay: new Date().toISOString() },
    { symbol: "GBPUSD", price: 1.31511, high: 1.31511, low: 1.31511, previousClose: 1.3156, change: -0.0005, changePercent: -0.038, latestTradingDay: new Date().toISOString() },
    { symbol: "USDCAD", price: 1.40494, high: 1.4058, low: 1.4045, previousClose: 1.4052, change: -0.0003, changePercent: -0.0213, latestTradingDay: new Date().toISOString() },
  ],
};
