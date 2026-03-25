// src/components/trading-dashboard/SymbolRow.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MarketQuote } from "@/types/interfaces";
import { useMarketStore } from "@/stores/useMarketStore";
import { TradingDialog } from "./TradingDialog";
import { useConfirm } from "@/components/common/ConfirmDialog";

function normalizeMarket(value: string | null | undefined) {
  const market = String(value ?? "").trim().toLowerCase();
  if (!market) return "";
  if (market === "fx") return "forex";
  if (market === "stock") return "acciones";
  if (market === "future") return "commodities";
  if (market === "fund" || market === "all") return "funds";
  return market;
}

function inferMarketFromSymbol(symbol: string) {
  const upper = symbol.toUpperCase();
  if (upper.endsWith("USDT")) return "crypto";
  if (/^[A-Z]{6}$/.test(upper)) return "forex";
  return "acciones";
}

function isMarketOpenForMarket(market: string, now: Date): boolean {
  const utc = new Date(now.toISOString());
  const day = utc.getUTCDay();
  const hour = utc.getUTCHours();
  const minute = utc.getUTCMinutes();
  const timeMinutes = hour * 60 + minute;

  const inRange = (sh: number, sm: number, eh: number, em: number) => {
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
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

export default function SymbolRow({
  symbol,
  market: rowMarket,
  source,
  isFavorite,
  price,
  high,
  low,
  previousClose,
  change,
  changePercent,
  latestTradingDay,
}: MarketQuote) {
  const { selectedSymbol, setSelectedSymbol, toggleFavoriteSymbol, refreshSymbolQuote } =
    useMarketStore();
  const confirm = useConfirm();

  const symbolMarket = useMemo(
    () => normalizeMarket(rowMarket) || inferMarketFromSymbol(symbol),
    [rowMarket, symbol]
  );
  const isSelected = useMemo(
    () => selectedSymbol?.toUpperCase() === symbol.toUpperCase(),
    [selectedSymbol, symbol]
  );

  const isMarketOpen = useMemo(
    () => isMarketOpenForMarket(symbolMarket, new Date()),
    [symbolMarket]
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
      forex: 0.0001,
      crypto: 0.0008,
      acciones: 0.0002,
      indices: 0.0003,
      commodities: 0.0004,
      funds: 0.0002,
    }),
    []
  );

  const spread = spreadPctByMarket[symbolMarket] ?? 0.0005;
  const targetSell = useMemo(
    () => Number((live * (1 + spread)).toFixed(2)),
    [live, spread]
  );
  const targetBuy = useMemo(
    () => Number((live * (1 - spread)).toFixed(2)),
    [live, spread]
  );
  const targetChange = change ?? 0;
  const targetChangePct =
    typeof changePercent === "number" && Number.isFinite(changePercent)
      ? changePercent
      : null;

  const [sellPrice, setSellPrice] = useState(targetSell);
  const [buyPrice, setBuyPrice] = useState(targetBuy);
  const [changeValue, setChangeValue] = useState(Math.abs(targetChange));
  const [sellColor, setSellColor] = useState("#b8b5b5");
  const [buyColor, setBuyColor] = useState("#b8b5b5");
  const [changeColor, setChangeColor] = useState(
    targetChange < 0 ? "#db3535" : targetChange > 0 ? "#16a34a" : "#b8b5b5"
  );
  const [isNegative, setIsNegative] = useState(targetChange < 0);
  const prevSellRef = useRef(sellPrice);
  const prevBuyRef = useRef(buyPrice);
  const prevChangeRef = useRef(targetChange);

  const short = (value?: number) =>
    value !== undefined && Number.isFinite(value) ? value.toFixed(2) : "-";

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
    else if (newChange === 0) setChangeColor("#b8b5b5");

    setIsNegative(newChange < 0);
    setChangeValue(Math.abs(newChange));

    prevChangeRef.current = newChange;
  }, [targetChange, isMarketOpen]);

  const changeText = useMemo(() => {
    const signIcon = isNegative ? "▼" : "▲";
    const base = `${signIcon} ${changeValue.toFixed(2)}`;
    if (targetChangePct === null) return base;
    return `${base} (${Math.abs(targetChangePct).toFixed(2)}%)`;
  }, [changeValue, isNegative, targetChangePct]);

  return (
    <div className="px-1 pt-2">
      <div
        onClick={() => {
          setSelectedSymbol(symbol);
          void refreshSymbolQuote(symbol, {
            market: rowMarket ?? symbolMarket,
            exchange: typeof source === "string" ? source : null,
          });
        }}
        className={`
          grid grid-cols-[minmax(0,1fr)_minmax(74px,86px)_minmax(74px,86px)] items-center gap-2 p-2
          rounded-xl border transition-colors cursor-pointer
          ${
            isSelected
              ? "border-yellow-500/70 bg-yellow-500/10 shadow-[0_0_0_1px_rgba(234,179,8,0.35)]"
              : "border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface)]"
          }
        `}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={async (event) => {
                event.stopPropagation();
                const shouldMark = !Boolean(isFavorite);

                const ok = await confirm({
                  title: shouldMark
                    ? `Marcar ${symbol} como favorita?`
                    : `Desmarcar ${symbol} de favoritas?`,
                  description: shouldMark
                    ? "Este simbolo se agregara al listado de favoritas."
                    : "Este simbolo se quitara del listado de favoritas.",
                  confirmText: shouldMark ? "Marcar favorita" : "Desmarcar favorita",
                  cancelText: "Cancelar",
                  confirmClassName: shouldMark
                    ? "border border-yellow-500/70 bg-transparent text-yellow-300 hover:bg-yellow-500/10"
                    : undefined,
                  destructive: !shouldMark,
                });

                if (!ok) return;
                toggleFavoriteSymbol(symbol, {
                  market: rowMarket ?? symbolMarket,
                  exchange: typeof source === "string" ? source : null,
                  scope: null,
                });
              }}
              title={isFavorite ? "Desmarcar favorita" : "Marcar favorita"}
              aria-label={isFavorite ? "Desmarcar favorita" : "Marcar favorita"}
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                isFavorite
                  ? "border-yellow-500/80 text-yellow-300 hover:bg-yellow-500/10"
                  : "border-zinc-500/70 text-zinc-400 hover:bg-zinc-500/10"
              }`}
            >
              ★
            </button>

            <span className="truncate text-sm font-semibold text-[var(--color-text)]">
              {symbol}
            </span>

            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                isMarketOpen ? "bg-emerald-400" : "bg-red-500"
              }`}
              title={isMarketOpen ? "Mercado abierto" : "Mercado cerrado"}
            />
          </div>

          <div
            className="pl-8 pt-0.5 text-[11px] font-semibold leading-none sm:text-xs"
            style={{ color: changeColor }}
          >
            {changeText}
          </div>
        </div>

        <div
          className="w-full rounded-md border border-emerald-500/20 transition-colors duration-300"
          style={{
            backgroundColor:
              sellColor === "#b8b5b5" ? "transparent" : `${sellColor}20`,
          }}
        >
          <TradingDialog
            text={short(sellPrice)}
            symbol={symbol}
            tipoOperacion="buy"
            colorText={sellColor}
            sellPrice={sellPrice}
            buyPrice={buyPrice}
            isMarketOpen={isMarketOpen}
            market={rowMarket ?? symbolMarket}
            exchange={typeof source === "string" ? source : null}
            scope={null}
          />
        </div>

        <div
          className="w-full rounded-md border border-red-500/20 transition-colors duration-300"
          style={{
            backgroundColor:
              buyColor === "#b8b5b5" ? "transparent" : `${buyColor}20`,
          }}
        >
          <TradingDialog
            text={short(buyPrice)}
            symbol={symbol}
            tipoOperacion="sell"
            colorText={buyColor}
            sellPrice={sellPrice}
            buyPrice={buyPrice}
            isMarketOpen={isMarketOpen}
            market={rowMarket ?? symbolMarket}
            exchange={typeof source === "string" ? source : null}
            scope={null}
          />
        </div>
      </div>
    </div>
  );
}
