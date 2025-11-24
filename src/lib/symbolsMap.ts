// lib/symbolsMap.ts

const SYMBOLS_MAP: Record<string, string[]> = {
  indices: ['SPY', 'QQQ', 'DIA', 'IWM', 'IVV', 'SPLG', 'VOO', 'EFA', 'EEM', 'VXX'],
  acciones: ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'FB', 'NFLX', 'NVDA', 'BABA', 'JPM', 'V', 'DIS'],
  commodities: ['GLD', 'USO', 'SLV', 'PALL', 'DBO', 'GDX', 'UNG', 'CORN', 'WEAT', 'SOYB'],
  crypto: ['BTC', 'ETH', 'LTC', 'XRP', 'DOGE', 'USDT', 'ADA', 'DOT', 'BCH', 'LINK', 'XLM', 'XMR'],
  fx: ['EURUSD', 'USDJPY', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCAD', 'USDCHF', 'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CHFJPY', 'EURAUD', 'NZDJPY', 'CADJPY', 'EURCAD', 'EURNZD', 'AUDCAD', 'AUDNZD', 'GBPCHF', 'NZDCAD'],
};

export default SYMBOLS_MAP;