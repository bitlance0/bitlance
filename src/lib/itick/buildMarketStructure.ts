// src/lib/itick/buildMarketStructure.ts

export type ItickStructure = Record<
  string,
  Record<
    string,
    Record<
      string,
      {
        symbol: string
        name: string
      }[]
    >
  >
>;

export function buildMarketStructure(data: any[]) {
  const markets: any = {
    acciones: {},
    crypto: {},
    forex: {},
    indices: {},
    commodities: {},
    funds: {},
  };

  data.forEach((item) => {
    const type = item.t;
    const exchange = item.e || "Unknown";
    const sector = item.s || "General";
    const symbol = item.c;

    const add = (market: any) => {
      if (!market[exchange]) market[exchange] = [];
      // if (!market[exchange][sector]) market[exchange][sector] = [];
      market[exchange].push({ symbol, name: item.n, exchange, sector, logo: item.l });
    };

    switch (type) {
      case "stock":
        add(markets.acciones);
        break;

      case "crypto":
        add(markets.crypto);
        break;

      case "forex":
        add(markets.forex);
        break;

      case "indices":
        add(markets.indices);
        break;

      case "future":
        add(markets.commodities);
        break;

      case "fund":
        add(markets.funds);
        break;
    }
  });

  return markets;
}