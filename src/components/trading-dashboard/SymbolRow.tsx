// src/components/trading-dashboard/SymbolRow.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MarketQuote } from "@/types/interfaces";
import { useMarketStore } from "@/stores/useMarketStore";
import { TradingDialog } from "./TradingDialog";
import SYMBOLS_MAP from "@/lib/symbolsMap";

/** Mapea símbolo -> market para definir spreads / horarios */
function marketOfSymbol(sym: string): keyof typeof SYMBOLS_MAP | "acciones" {
  const S = sym.toUpperCase();
  for (const [m, arr] of Object.entries(SYMBOLS_MAP)) {
    if (arr.map((x) => x.toUpperCase()).includes(S)) return m as keyof typeof SYMBOLS_MAP;
  }
  return "acciones";
}

/** Misma lógica de horarios que usamos en TradingDialog / trade-engine */
function isMarketOpenForMarket(market: string, now: Date): boolean {
  const utc = new Date(now.toISOString());
  const day = utc.getUTCDay(); // 0=Domingo ... 6=Sábado
  const hour = utc.getUTCHours();
  const minute = utc.getUTCMinutes();
  const timeMinutes = hour * 60 + minute;

  const inRange = (sh: number, sm: number, eh: number, em: number) => {
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    return timeMinutes >= start && timeMinutes <= end;
  };

  if (market === "crypto") return true; // 24/7

  if (market === "fx") {
    if (day === 0 || day === 6) return false;
    return true; // simplificado: 24h L–V
  }

  if (["indices", "acciones", "commodities"].includes(market)) {
    if (day === 0 || day === 6) return false;
    // Sesión NY aprox 14:30–21:00 UTC
    return inRange(14, 30, 21, 0);
  }

  if (day === 0 || day === 6) return false;
  return inRange(13, 0, 21, 0);
}

export default function SymbolRow({
  symbol,
  price,
  high,
  low,
  previousClose,
  change,
  changePercent,
  latestTradingDay,
}: MarketQuote) {
  const { setSelectedSymbol } = useMarketStore();
  const market = useMemo(() => marketOfSymbol(symbol), [symbol]);

  const isMarketOpen = useMemo(
    () => isMarketOpenForMarket(market, new Date()),
    [market]
  );

  const [displayPrice, setDisplayPrice] = useState<number>(price ?? 0);

  useEffect(() => {
    if (typeof price !== "number" || !Number.isFinite(price)) return;
    if (isMarketOpen) {
      setDisplayPrice(price);
    }
  }, [price, isMarketOpen]);

  const live = displayPrice;

  const spreadPctByMarket: Record<string, number> = useMemo(
    () => ({
      fx: 0.0001,
      crypto: 0.0008,
      acciones: 0.0002,
      indices: 0.0003,
      commodities: 0.0004,
    }),
    []
  );

  const spread = spreadPctByMarket[market] ?? 0.0005;
  const targetSell = useMemo(
    () => Number((live * (1 + spread)).toFixed(2)),
    [live, spread]
  );
  const targetBuy = useMemo(
    () => Number((live * (1 - spread)).toFixed(2)),
    [live, spread]
  );
  const targetChange = change ?? 0;

  const [sellPrice, setSellPrice] = useState(targetSell);
  const [buyPrice, setBuyPrice] = useState(targetBuy);
  const [changeValue, setChangeValue] = useState(Math.abs(targetChange));
  const [sellColor, setSellColor] = useState("#b8b5b5");
  const [buyColor, setBuyColor] = useState("#b8b5b5");
  const [changeColor, setChangeColor] = useState("#16a34a");
  const [isNegative, setIsNegative] = useState(targetChange < 0);
  const prevSellRef = useRef(sellPrice);
  const prevBuyRef = useRef(buyPrice);
  const prevChangeRef = useRef(targetChange);

  const short = (v?: number) => (v !== undefined ? v.toFixed(2) : "-");

  useEffect(() => {
    if (!isMarketOpen) return;

    const newSell = targetSell;
    const newBuy = targetBuy;

    const prevSell = prevSellRef.current;
    const prevBuy = prevBuyRef.current;

    if (newSell > prevSell) setSellColor("#16a34a");
    else if (newSell < prevSell) setSellColor("#db3535");
    else setSellColor("#b8b5b5");

    if (newBuy > prevBuy) setBuyColor("#16a34a");
    else if (newBuy < prevBuy) setBuyColor("#db3535");
    else setBuyColor("#b8b5b5");

    setSellPrice(newSell);
    setBuyPrice(newBuy);

    prevSellRef.current = newSell;
    prevBuyRef.current = newBuy;
  }, [targetSell, targetBuy, isMarketOpen]);

  useEffect(() => {
    if (!isMarketOpen) return;

    const newChange = targetChange;
    const prevChange = prevChangeRef.current;

    if (newChange > prevChange) setChangeColor("#16a34a");
    else if (newChange < prevChange) setChangeColor("#db3535");

    setIsNegative(newChange < 0);
    setChangeValue(Math.abs(newChange));

    prevChangeRef.current = newChange;
  }, [targetChange, isMarketOpen]);

  return (
    <div className="mx-1 my-2 mt-3 transition-all duration-200">
      <div
        onClick={() => setSelectedSymbol(symbol)}
        className="
          grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 p-2
          rounded-xl border border-[var(--color-border)]
          bg-[var(--color-surface-alt)]
          hover:bg-[var(--color-surface)]
          transition-colors cursor-pointer
        "
      >
        <div className="flex items-center gap-2 leading-tight p-1">
          <span
            className={`
              inline-block w-2 h-2 rounded-full
              ${isMarketOpen ? "bg-emerald-400" : "bg-zinc-500"}
            `}
            title={isMarketOpen ? "Mercado abierto" : "Mercado cerrado"}
          />
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {symbol}
          </span>
        </div>

        {/* SELL Button */}
        <div
          className="rounded-md transition-colors duration-300"
          style={{
            backgroundColor:
              sellColor === "#b8b5b5" ? "transparent" : sellColor + "20",
          }}
        >
          <TradingDialog
            text={short(sellPrice)}
            symbol={symbol}
            tipoOperacion="buy"
            colorText={sellColor}
            sellPrice={sellPrice}
            buyPrice={buyPrice}
            isMarketOpen={isMarketOpen} // ⬅️ AQUÍ
          />
        </div>

        {/* CHANGE central */}
        <div
          className="min-w-[35px] text-center text-[13px] font-semibold transition-colors duration-300"
          style={{ color: changeColor }}
        >
          {isNegative ? "▼" : "▲"} {changeValue.toFixed(2)}
        </div>

        {/* BUY Button */}
        <div
          className="rounded-md transition-colors duration-300"
          style={{
            backgroundColor:
              buyColor === "#b8b5b5" ? "transparent" : buyColor + "20",
          }}
        >
          <TradingDialog
            text={short(buyPrice)}
            symbol={symbol}
            tipoOperacion="sell"
            colorText={buyColor}
            sellPrice={sellPrice}
            buyPrice={buyPrice}
            isMarketOpen={isMarketOpen} // ⬅️ Y AQUÍ
          />
        </div>
      </div>
    </div>
  );
}
