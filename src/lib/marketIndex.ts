// src/lib/marketIndex.ts

export const MARKET_INDEX = {
  "acciones": {
    "label": "Acciones",
    "exchanges": [
      "SSE",
      "HKEX",
      "SZSE",
      "MYX",
      "BIST",
      "BME",
      "SET",
      "BMV",
      "NASDAQ",
      "NYSE",
      "NSE",
      "TWSE",
      "SGX",
      "NYSE Arca",
      "OTC",
      "EURONEXT",
      "LSIN",
      "LSE",
      "TSE",
      "FWB",
      "XETR",
      "TPEX",
      "NAG",
      "SAPSE",
      "FSE",
      "UPCOM",
      "BSE",
      "ASX",
      "BVL",
      "CSE",
      "KRX",
      "NSENG",
      "TSXV",
      "PSX",
      "TASE",
      "AMEX",
      "IDX",
      "TSX",
      "NEO",
      "HOSE",
      "HNX",
      "MIL",
      "BCBA",
      "CBOE"
    ]
  },
  "crypto": {
    "label": "Criptomonedas",
    "exchanges": [
      "Binance",
      "Bitget"
    ]
  },
  "forex": {
    "label": "Forex",
    "exchanges": [
      "FXCM",
      "OANDA"
    ]
  },
  "indices": {
    "label": "Índices",
    "exchanges": [
      "FXCM",
      "SZSE",
      "SP",
      "SSE",
      "HSI",
      "NASDAQ",
      "DJ",
      "TSE",
      "KRX",
      "FTSE"
    ]
  },
  "commodities": {
    "label": "Commodities",
    "exchanges": [
      "CBOE",
      "HKEX"
    ]
  },
  "funds": {
    "label": "Funds",
    "exchanges": [
      "AMEX",
      "NASDAQ",
      "CBOE",
      "OTC",
      "NYSE"
    ]
  }
} as const;

export type MarketKey = keyof typeof MARKET_INDEX;