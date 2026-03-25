// src/lib/itick/marketConfig.ts
export const ITICK_TYPE_MAP: Record<string, string> = {
  acciones: "stock",
  crypto: "crypto",
  forex: "forex",
  indices: "indices",
  commodities: "future",
  funds: "fund",
};

export const ITICK_REGION_BY_MARKET_EXCHANGE: Record<string, Record<string, string>> = {
  crypto: {
    Binance: "BA",
    Bitget: "BA",
  },
  forex: {
    FXCM: "GB",
    OANDA: "GB",
  },
  indices: {
    FXCM: "GB",
    SZSE: "CN",
    SP: "US",
    SSE: "CN",
    HSI: "HK",
    NASDAQ: "US",
    DJ: "US",
    TSE: "JP",
    KRX: "KR",
    FTSE: "GB",
  },
  acciones: {
    SSE: "CN",
    HKEX: "HK",
    SZSE: "CN",
    MYX: "MY",
    BIST: "TR",
    BME: "ES",
    SET: "TH",
    BMV: "MX",
    NASDAQ: "US",
    NYSE: "US",
    NSE: "IN",
    TWSE: "TW",
    SGX: "SG",
    "NYSE Arca": "US",
    OTC: "US",
    EURONEXT: "EU",
    LSE: "GB",
    TSE: "JP",
    FWB: "DE",
    XETR: "DE",
    BSE: "IN",
    ASX: "AU",
    KRX: "KR",
    TSXV: "CA",
    AMEX: "US",
    TSX: "CA",
    NEO: "CA",
  },
  commodities: {
    CBOE: "US",
    HKEX: "HK",
  },
  funds: {
    AMEX: "US",
    NASDAQ: "US",
    CBOE: "US",
    OTC: "US",
    NYSE: "US",
  },
};

export function resolveItickRegion(market: string, exchange: string): string | null {
  return ITICK_REGION_BY_MARKET_EXCHANGE?.[market]?.[exchange] ?? null;
}
