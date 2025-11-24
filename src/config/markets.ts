// src/config/markets.ts

export const MARKETS = {
  Indices: {
    buttons: ["Majors", "Indices Futures", "Americas", "Europe", "Asia/Pacific", "Middle East", "Africa"],
    getUrlMarkets: () =>
      "https://api.investing.com/api/financialdata/assets/sml/74?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10",
    // sub-markets (same order as buttons)
    majors: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/sml/74?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    indices_futures: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/domain/indices_futures?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    americas: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/indicesByContinent/1?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    europe: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/indicesByContinent/2?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    asia_pacific: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/indicesByContinent/3?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    middle_east: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/indicesByContinent/3?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    africa: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/indicesByContinent/5?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
  },

  Stocks: {
    buttons: ["Trending Stocks", "Most Active", "Top Gainers", "Top Losers", "52 Week High", "52 Week Low", "Dow Jones", "S&P 500", "Nasdaq"],
    getUrlMarkets: () =>
      "https://api.investing.com/api/financialdata/homepage/trending-stocks?country=5&filter-domain=www&limit=10",
    // sub-markets
    trending_stocks: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/homepage/trending-stocks?country=5&filter-domain=www&limit=10" },
    most_active: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/homepage/most-active-stocks?country=5&filter-domain=www&limit=10" },
    top_gainers: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/homepage/top-stock-gainers?country=5&filter-domain=www&limit=10" },
    top_losers: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/homepage/top-stock-losers?country=5&filter-domain=www&limit=10" },
    week_52_high: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/homepage/52-week-high?country=5&filter-domain=www&limit=10" },
    week_52_low: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/homepage/52-week-low?country=5&filter-domain=www&limit=10" },
    dow_jones: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/topMarketCapEquitiesByIndex/169?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2CvolumeOneDay%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&filter-domain=www&limit=10" },
    s_and_p_500: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/topMarketCapEquitiesByIndex/166?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2CvolumeOneDay%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&filter-domain=www&limit=10" },
    nasdaq: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/topMarketCapEquitiesByIndex/14958?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2CvolumeOneDay%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&filter-domain=www&limit=10" },
  },

  Commodities: {
    buttons: ["Real Time Futures", "Metals", "Grains", "Softs", "Energy", "Meats"],
    getUrlMarkets: () =>
      "https://api.investing.com/api/financialdata/assets/list/8830%2C8836%2C8849%2C8831%2C8833%2C8862%2C8988%2C8916%2C8917%2C954867?fields-list=name%2Cmonth%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10",
    // sub-markets
    real_time_futures: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/list/8830%2C8836%2C8849%2C8831%2C8833%2C8862%2C8988%2C8916%2C8917%2C954867?fields-list=name%2Cmonth%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    metals: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/domainsPairsBySml/4?fields-list=name%2Cmonth%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    grains: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/domainsPairsBySml/9?fields-list=name%2Cmonth%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    softs: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/domainsPairsBySml/7?fields-list=name%2Cmonth%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    energy: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/domainsPairsBySml/2?fields-list=name%2Cmonth%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    meats: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/domainsPairsBySml/10?fields-list=name%2Cmonth%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
  },

  Currencies: {
    buttons: ["Majors", "Local"],
    getUrlMarkets: () =>
      "https://api.investing.com/api/financialdata/homepage/major-currencies?limit=10",
    // sub-markets
    majors: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/homepage/major-currencies?limit=10" },
    local: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/homepage/local-currencies?id=12&limit=10" },
  },

  ETFs: {
    buttons: ["Major ETFs", "Most Active", "Top Gainers", "Equities", "Bonds", "Commodities", "Currencies"],
    getUrlMarkets: () =>
      "https://api.investing.com/api/financialdata/assets/fundsByDomain/majorEtfs?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2CvolumeOneDay%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10",
    // sub-markets
    major_etfs: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/fundsByDomain/majorEtfs?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2CvolumeOneDay%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    most_active: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/etfsByCountry/mostActive?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2CvolumeOneDay%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    top_gainers: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/etfsByCountry/topGainers?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2CvolumeOneDay%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    equities: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/etfsByType/equities?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2CvolumeOneDay%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    bonds: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/etfsByType/bonds?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2CvolumeOneDay%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    commodities: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/etfsByType/commodities?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2CvolumeOneDay%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    currencies: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/etfsByType/currencies?fields-list=name%2Clast%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2CvolumeOneDay%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
  },

  Bonds: {
    buttons: ["Majors"],
    getUrlMarkets: () =>
      "https://api.investing.com/api/financialdata/assets/pairsByScreen/6?fields-list=name%2Cyield%2Cprev%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol%2Clast&country-id=5&limit=10",
    // sub-markets
    majors: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/pairsByScreen/6?fields-list=name%2Cyield%2Cprev%2Chigh%2Clow%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol%2Clast&country-id=5&limit=10" },
  },

  Funds: {
    buttons: ["Majors", "Equities", "Commodities", "Bonds"],
    getUrlMarkets: () =>
      "https://api.investing.com/api/financialdata/assets/fundsByDomain/major?fields-list=name%2Csymbol%2Clast%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10",
    // sub-markets
    majors: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/fundsByDomain/major?fields-list=name%2Csymbol%2Clast%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    equities: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/fundsByDomain/equities?fields-list=name%2Csymbol%2Clast%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    commodities: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/fundsByDomain/commodities?fields-list=name%2Csymbol%2Clast%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
    bonds: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/assets/fundsByDomain/bonds?fields-list=name%2Csymbol%2Clast%2CchangeOneDay%2CchangeOneDayPercent%2Ctime%2CisOpen%2Cflag%2Curl%2ClastPairDecimal%2CchangeDecimalPrecision%2CchangePercentageDecimalPrecision%2Csymbol&country-id=5&limit=10" },
  },

  Cryptocurrency: {
    buttons: ["Majors", "Top Gainers", "Top Losers", "Stocks", "ETFs"],
    getUrlMarkets: () =>
      "https://api.investing.com/api/financialdata/homepage/major-cryptocurrencies?limit=10",
    // sub-markets
    majors: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/homepage/major-cryptocurrencies?limit=10" },
    top_gainers: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/homepage/top-cryptocurrencies-gainers?limit=10" },
    top_losers: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/homepage/top-cryptocurrencies-losers?limit=10", },
    stocks: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/homepage/cryptocurrencies-stocks?limit=10" },
    etfs: { getUrlMarkets: () => "https://api.investing.com/api/financialdata/homepage/cryptocurrencies-etfs?limit=10" },
  },
};

/* ---------------------- Configuración columnas ---------------------- */

export const HEADERS: Record<string, string[]> = {
  Indices: ["Name", "Last", "High", "Low", "Chg.", "Chg. %", "Time"],
  Stocks: ["Name", "Last", "High", "Low", "Chg.", "Chg. %", "Vol.", "Time"],
  Commodities: ["Name", "Month", "Last", "High", "Low", "Chg.", "Chg. %", "Time"],
  Currencies: ["Name", "Bid", "Ask", "High", "Low", "Chg.", "Chg. %", "Time"],
  ETFs: ["Name", "Last", "High", "Low", "Chg.", "Chg. %", "Vol.", "Time"],
  Bonds: ["Name", "Yield", "Prev.", "High", "Low", "Chg.", "Chg. %", "Time"],
  Funds: ["Name", "Symbol", "Last", "Chg.", "Chg. %", "Time"],
  Cryptocurrency: ["Name", "Last", "Chg.", "Chg. %", "Vol.", "Time"],
};

export const KEYS: Record<string, string[]> = {
  Indices: ["name", "last", "high", "low", "chg", "chgPct", "time"],
  Stocks: ["name", "last", "high", "low", "chg", "chgPct", "volume", "time"],
  Commodities: ["name", "month", "last", "high", "low", "chg", "chgPct", "time"],
  Currencies: ["name", "bid", "ask", "high", "low", "chg", "chgPct", "time"],
  ETFs: ["name", "last", "high", "low", "chg", "chgPct", "volume", "time"],
  Bonds: ["name", "yield", "prev", "high", "low", "chg", "chgPct", "time"],
  Funds: ["name", "symbol", "last", "chg", "chgPct", "time"],
  Cryptocurrency: ["name", "last", "chg", "chgPct", "volume", "time"],
};
