import SYMBOLS_MAP from "@/lib/symbolsMap";

export function marketOfSymbol(sym: string | null): keyof typeof SYMBOLS_MAP | "acciones" {
  if (!sym) return "acciones";
  const symbol = sym.toUpperCase();
  for (const [market, symbols] of Object.entries(SYMBOLS_MAP)) {
    if (symbols.map((item) => item.toUpperCase()).includes(symbol)) {
      return market as keyof typeof SYMBOLS_MAP;
    }
  }
  return "acciones";
}

export function isMarketOpenForMarket(market: string, now: Date): boolean {
  const utc = new Date(now.toISOString());
  const day = utc.getUTCDay();
  const hour = utc.getUTCHours();
  const minute = utc.getUTCMinutes();
  const timeMinutes = hour * 60 + minute;

  const inRange = (startHour: number, startMinute: number, endHour: number, endMinute: number) => {
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    return timeMinutes >= start && timeMinutes <= end;
  };

  if (market === "crypto") return true;

  if (market === "fx" || market === "forex") {
    if (day === 0 || day === 6) return false;
    return true;
  }

  if (["indices", "acciones", "commodities"].includes(market)) {
    if (day === 0 || day === 6) return false;
    return inRange(14, 30, 21, 0);
  }

  if (day === 0 || day === 6) return false;
  return inRange(13, 0, 21, 0);
}

export function isSymbolMarketOpen(symbol: string | null, now = new Date()) {
  const market = marketOfSymbol(symbol);
  const open = isMarketOpenForMarket(market, now);
  return { open, market };
}
