"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { ChevronDown, AlertCircle } from "lucide-react";

import SYMBOLS_MAP from "@/lib/symbolsMap";
import { formatCurrency } from "@/lib/utils";
import { useUserStore } from "@/stores/useUserStore";
import { useMarketStore } from "@/stores/useMarketStore";

import { ModeToggle } from "./trading-dialog-components/ModeToggle";
import { SideToggle } from "./trading-dialog-components/SideToggle";
import { UnitsTable } from "./trading-dialog-components/UnitsTable";
import { OrderPanelMarket } from "./trading-dialog-components/OrderPanelMarket";
import { DialogHeaderTrade } from "./trading-dialog-components/DialogHeaderTrade";
import { OrderPanelPending } from "./trading-dialog-components/OrderPanelPending";
import { toast } from "sonner";

export interface TradingDialogProps {
  text: string;
  symbol: string | null;
  tipoOperacion: "buy" | "sell";
  colorText: string;
  sellPrice?: number;
  buyPrice?: number;
  isMarketOpen?: boolean;
}

type Mode = "market" | "pending";
type TriggerRule = "gte" | "lte";

/* ===== Helpers de mercado ===== */
function marketOfSymbol(
  sym: string | null
): keyof typeof SYMBOLS_MAP | "acciones" {
  if (!sym) return "acciones";
  const S = sym.toUpperCase();
  for (const [m, arr] of Object.entries(SYMBOLS_MAP)) {
    if (arr.map((x) => x.toUpperCase()).includes(S))
      return m as keyof typeof SYMBOLS_MAP;
  }
  return "acciones";
}

const MARGIN_CONFIG = {
  crypto: 0.05,
  fx: 0.03,
  indices: 0.05,
  acciones: 0.1,
  commodities: 0.08,
} as const;

const SPREAD_BY_MARKET: Record<string, number> = {
  fx: 0.0003,
  crypto: 0.003,
  acciones: 0.001,
  indices: 0.001,
  commodities: 0.001,
};

const PRICE_DECIMALS = 6;

/** Helper horario muy simple por tipo de mercado (en UTC). */
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
    return true; // 24h L–V (simplificado)
  }

  if (["indices", "acciones", "commodities"].includes(market)) {
    if (day === 0 || day === 6) return false;
    return inRange(14, 30, 21, 0); // NY aprox
  }

  if (day === 0 || day === 6) return false;
  return inRange(13, 0, 21, 0);
}

export function TradingDialog({
  text,
  symbol,
  tipoOperacion,
  colorText,
  sellPrice: sellPriceProp,
  buyPrice: buyPriceProp,
  isMarketOpen: isMarketOpenProp,
}: TradingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageExists, setImageExists] = useState(true);
  const [operationType, setOperationType] = useState<"buy" | "sell">(
    tipoOperacion || "buy"
  );
  const [mode, setMode] = useState<Mode>("market");
  const [selectedUnitOption, setSelectedUnitOption] = useState<number>(1);

  // pending
  const [triggerPrice, setTriggerPrice] = useState<string>("");
  const [triggerRule, setTriggerRule] = useState<TriggerRule>("gte");

  // opciones avanzadas SL/TP
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");

  // reloj para fallback de horario
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { user, updateUserBalance } = useUserStore();

  const liveFromStore = useMarketStore((s) => {
    if (!symbol) return undefined;
    const S = symbol.toUpperCase();
    const live = s.livePrices[S];
    if (typeof live === "number") return live;
    const row = s.dataMarket.find((q) =>
      [q.symbol, (q as any).ticker, (q as any).code]
        .map((x) => String(x || "").toUpperCase())
        .includes(S)
    );
    return typeof row?.price === "number" ? row.price : undefined;
  });

  const market = useMemo(() => marketOfSymbol(symbol), [symbol]);
  const marginRate =
    MARGIN_CONFIG[market as keyof typeof MARGIN_CONFIG] ?? 0.05;
  const spread = SPREAD_BY_MARKET[market] ?? 0.002;

  // ===== mercado abierto/cerrado (prop > horario) =====
  const isMarketOpen = useMemo(
    () =>
      typeof isMarketOpenProp === "boolean"
        ? isMarketOpenProp
        : isMarketOpenForMarket(market, now),
    [market, now, isMarketOpenProp]
  );

  // ===== precio base (live) =====
  const liveMid = useMemo(() => {
    if (
      isMarketOpen &&
      typeof liveFromStore === "number" &&
      Number.isFinite(liveFromStore)
    ) {
      return liveFromStore;
    }

    const fromText = parseFloat(String(text ?? "").replace(/[^\d.-]/g, ""));
    if (Number.isFinite(fromText)) return fromText;

    const propMid =
      typeof buyPriceProp === "number" && typeof sellPriceProp === "number"
        ? (buyPriceProp + sellPriceProp) / 2
        : buyPriceProp ?? sellPriceProp ?? 0;

    return Number.isFinite(propMid) ? (propMid as number) : 0;
  }, [isMarketOpen, liveFromStore, text, buyPriceProp, sellPriceProp]);

  const derivedSell = useMemo(
    () => Number((liveMid * (1 + spread)).toFixed(PRICE_DECIMALS)),
    [liveMid, spread]
  );
  const derivedBuy = useMemo(
    () => Number((liveMid * (1 - spread)).toFixed(PRICE_DECIMALS)),
    [liveMid, spread]
  );

  const currentPrice = useMemo(() => {
    if (operationType === "buy") {
      if (Number.isFinite(derivedBuy)) return derivedBuy;
      if (Number.isFinite(buyPriceProp || NaN)) return buyPriceProp as number;
    } else {
      if (Number.isFinite(derivedSell)) return derivedSell;
      if (Number.isFinite(sellPriceProp || NaN))
        return sellPriceProp as number;
    }
    const priceFromText = parseFloat(String(text).replace(/[^\d.-]/g, ""));
    return Number.isFinite(priceFromText) ? priceFromText : 0;
  }, [operationType, derivedBuy, derivedSell, buyPriceProp, sellPriceProp, text]);

  const formattedFullPrice = useMemo(
    () =>
      Number.isFinite(currentPrice)
        ? currentPrice.toFixed(PRICE_DECIMALS)
        : "-",
    [currentPrice]
  );

  const maxUnits = useMemo(() => {
    const balance = Number(user?.balance ?? 0);
    if (balance <= 0 || currentPrice <= 0 || marginRate <= 0) return 0;
    const maxFromMargin = Math.floor(balance / (currentPrice * marginRate));
    const maxFromTotalValue = Math.floor(balance / currentPrice);
    const max = Math.min(maxFromMargin, maxFromTotalValue);
    return Number.isFinite(max) && max > 0 ? max : 0;
  }, [user?.balance, currentPrice, marginRate]);

  useEffect(() => {
    if (maxUnits <= 0) setSelectedUnitOption(0);
    else if (selectedUnitOption < 1 || selectedUnitOption > maxUnits)
      setSelectedUnitOption(1);
  }, [maxUnits, selectedUnitOption]);

  const unitOptions = useMemo(() => {
    if (maxUnits <= 0) return [];
    const options: number[] = [];
    for (let i = 1; i <= maxUnits;) {
      options.push(i);
      let step;
      if (i < 10) step = 1;
      else if (i < 100) step = 10;
      else if (i < 1000) step = 50;
      else if (i < 10000) step = 500;
      else if (i < 100000) step = 5000;
      else {
        const magnitude = Math.floor(Math.log10(i));
        step = 5 * Math.pow(10, magnitude - 1);
      }
      i += step;
    }
    if (options[options.length - 1] !== maxUnits) options.push(maxUnits);
    return options;
  }, [maxUnits]);

  const calculations = useMemo(() => {
    const cantidad = Number(selectedUnitOption ?? 0);
    const valor = cantidad * currentPrice;
    const margenEstimado = valor * marginRate;
    return {
      cantidad: Number.isFinite(cantidad) ? cantidad : 0,
      valor: Number.isFinite(valor) ? valor : 0,
      margenEstimado: Number.isFinite(margenEstimado) ? margenEstimado : 0,
    };
  }, [selectedUnitOption, currentPrice, marginRate]);

  const hasSufficientBalance = useMemo(() => {
    const balance = Number(user?.balance ?? 0);
    const { margenEstimado } = calculations;
    if (!Number.isFinite(balance) || !Number.isFinite(margenEstimado))
      return false;
    return balance >= margenEstimado;
  }, [user?.balance, calculations]);

  useEffect(() => {
    setOperationType(tipoOperacion);
  }, [tipoOperacion]);

  const dialogTitle = operationType === "buy" ? "Comprar" : "Vender";
  const short = (v?: number) => (typeof v === "number" ? v.toFixed(4) : "-");

  const triggerLabel = useMemo(() => {
    const dynamic = operationType === "buy" ? derivedBuy : derivedSell;
    if (Number.isFinite(dynamic)) return short(dynamic);
    const parsed = parseFloat(String(text ?? "").replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return short(parsed);
    return text;
  }, [operationType, derivedBuy, derivedSell, text]);

  // ==== números crudos SL/TP/Trigger ====
  const triggerPriceNum = useMemo(
    () => Number(String(triggerPrice).replace(/[^\d.-]/g, "")),
    [triggerPrice]
  );
  const takeProfitNum = useMemo(
    () => Number(String(takeProfit).replace(/[^\d.-]/g, "")),
    [takeProfit]
  );
  const stopLossNum = useMemo(
    () => Number(String(stopLoss).replace(/[^\d.-]/g, "")),
    [stopLoss]
  );

  const pendingValid =
    mode === "pending" &&
    symbol &&
    calculations.cantidad > 0 &&
    Number.isFinite(triggerPriceNum) &&
    triggerPriceNum > 0;

  // precio de referencia para SL/TP
  const entryReferencePrice = useMemo(() => {
    if (
      mode === "pending" &&
      Number.isFinite(triggerPriceNum) &&
      triggerPriceNum > 0
    ) {
      return triggerPriceNum;
    }
    return currentPrice;
  }, [mode, triggerPriceNum, currentPrice]);

  const sideSign = useMemo(
    () => (operationType === "buy" ? 1 : -1),
    [operationType]
  );
  const leverageNum = 1;
  const positionQty = calculations.cantidad;

  const slMetrics = useMemo(() => {
    if (!stopLoss.trim()) return null;
    if (!Number.isFinite(entryReferencePrice) || entryReferencePrice <= 0)
      return null;
    if (!Number.isFinite(stopLossNum) || stopLossNum <= 0) return null;
    if (!Number.isFinite(positionQty) || positionQty <= 0) return null;

    const diff = stopLossNum - entryReferencePrice;
    const pct = (diff / entryReferencePrice) * 100;
    const pnl = diff * positionQty * sideSign * leverageNum;

    return { diff, pct, pnl };
  }, [
    stopLoss,
    stopLossNum,
    entryReferencePrice,
    positionQty,
    sideSign,
    leverageNum,
  ]);

  const tpMetrics = useMemo(() => {
    if (!takeProfit.trim()) return null;
    if (!Number.isFinite(entryReferencePrice) || entryReferencePrice <= 0)
      return null;
    if (!Number.isFinite(takeProfitNum) || takeProfitNum <= 0) return null;
    if (!Number.isFinite(positionQty) || positionQty <= 0) return null;

    const diff = takeProfitNum - entryReferencePrice;
    const pct = (diff / entryReferencePrice) * 100;
    const pnl = diff * positionQty * sideSign * leverageNum;

    return { diff, pct, pnl };
  }, [
    takeProfit,
    takeProfitNum,
    entryReferencePrice,
    positionQty,
    sideSign,
    leverageNum,
  ]);

  // ===== validación SL/TP =====
  function validateRiskOrders() {
    const price = entryReferencePrice;
    const hasTP = takeProfit.trim() !== "";
    const hasSL = stopLoss.trim() !== "";

    if (!hasTP && !hasSL) return true;

    if (!Number.isFinite(price) || price <= 0) {
      toast.error(
        "No se pudo determinar el precio de entrada para validar TP/SL"
      );
      return false;
    }

    if (hasTP) {
      if (!Number.isFinite(takeProfitNum) || takeProfitNum <= 0) {
        toast.error("Ingresa un precio válido de Take Profit");
        return false;
      }
      if (operationType === "buy" && takeProfitNum <= price) {
        toast.error(
          "En compras, el Take Profit debe ser mayor al precio de entrada."
        );
        return false;
      }
      if (operationType === "sell" && takeProfitNum >= price) {
        toast.error(
          "En ventas, el Take Profit debe ser menor al precio de entrada."
        );
        return false;
      }
    }

    if (hasSL) {
      if (!Number.isFinite(stopLossNum) || stopLossNum <= 0) {
        toast.error("Ingresa un precio válido de Stop Loss");
        return false;
      }
      if (operationType === "buy" && stopLossNum >= price) {
        toast.error(
          "En compras, el Stop Loss debe ser menor al precio de entrada."
        );
        return false;
      }
      if (operationType === "sell" && stopLossNum <= price) {
        toast.error(
          "En ventas, el Stop Loss debe ser mayor al precio de entrada."
        );
        return false;
      }
    }

    return true;
  }

  async function handleConfirmTrade() {
    if (!user?.id) return toast.error("No autenticado");
    if (!isMarketOpen)
      return toast.error("Este activo no es negociable en este momento");
    if (!hasSufficientBalance)
      return toast.error("Saldo insuficiente para abrir la operación");
    if (calculations.cantidad <= 0)
      return toast.error("Selecciona una cantidad válida de unidades");
    if (!validateRiskOrders()) return;

    const hasTP = takeProfit.trim() !== "";
    const hasSL = stopLoss.trim() !== "";

    try {
      const res = await fetch("/api/trade/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          symbol,
          side: operationType,
          entryPrice: currentPrice,
          quantity: calculations.cantidad,
          leverage: 1,
          takeProfit: hasTP ? takeProfitNum : null,
          stopLoss: hasSL ? stopLossNum : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al abrir operación");
      toast.success("Operación abierta exitosamente");
      if (typeof data?.trade?.balanceAfter === "number") {
        updateUserBalance(Number(data.trade.balanceAfter));
      }
      setIsOpen(false);
    } catch (err) {
      console.error("❌ Error al abrir operación:", err);
      toast.error("Error al abrir la operación: " + String(err));
    }
  }

  async function handleCreatePending() {
    if (!user?.id) return toast.error("No autenticado");
    if (!isMarketOpen)
      return toast.error("Este activo no es negociable en este momento");
    if (!pendingValid)
      return toast.error("Revisa el precio objetivo y la condición");
    if (!validateRiskOrders()) return;

    const hasTP = takeProfit.trim() !== "";
    const hasSL = stopLoss.trim() !== "";

    try {
      const res = await fetch("/api/trade/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          symbol,
          side: operationType,
          quantity: calculations.cantidad,
          leverage: 1,
          triggerPrice: triggerPriceNum,
          triggerRule,
          takeProfit: hasTP ? takeProfitNum : null,
          stopLoss: hasSL ? stopLossNum : null,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.error || "No se pudo crear la operación pendiente"
        );
      toast.success("Orden pendiente creada");
      setIsOpen(false);
    } catch (err) {
      console.error("❌ Error creando pendiente:", err);
      toast.error("Error creando pendiente: " + String(err));
    }
  }

  const disabledMarketAction =
    !hasSufficientBalance ||
    calculations.cantidad <= 0 ||
    maxUnits <= 0 ||
    !isMarketOpen;

  const disabledPendingAction =
    !pendingValid || calculations.cantidad <= 0 || !isMarketOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          style={colorText ? { color: colorText } : undefined}
          className="min-w-[60px]"
          onClick={() => setIsOpen(true)}
          title={symbol || undefined}
        >
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] bg-[#202126] border border-gray-50/80 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pt-2">
            {imageExists ? (
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={`/symbols/${symbol}.png`}
                  alt={symbol || "Símbolo"}
                  width={32}
                  height={32}
                  className="object-contain"
                  loading="lazy"
                  onError={() => setImageExists(false)}
                />
              </div>
            ) : (
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground border border-gray-500">
                {symbol?.charAt(0)}
              </div>
            )}

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{dialogTitle}</span>
                <Separator
                  orientation="vertical"
                  className="h-4 bg-gray-500"
                />
                <Badge variant="secondary" className="px-2 py-1">
                  {symbol}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {symbol} vs USD
              </div>
            </div>
          </DialogTitle>

          <DialogHeaderTrade
            currentPrice={currentPrice}
            operationType={operationType}
            userBalance={Number(user?.balance ?? 0)}
            marginEstimate={calculations.margenEstimado}
            formatCurrency={formatCurrency}
          />
        </DialogHeader>

        <DialogDescription>
          Elige si deseas abrir al precio de mercado o crear una orden pendiente
          automatizada.
        </DialogDescription>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <ModeToggle mode={mode} onChange={setMode} />
          <SideToggle
            side={operationType}
            onChange={setOperationType}
            disableSell
          />
        </div>

        <UnitsTable
          currentPrice={currentPrice}
          marginRate={marginRate}
          unitOptions={unitOptions}
          selectedUnit={selectedUnitOption}
          onSelectUnit={setSelectedUnitOption}
          formatCurrency={formatCurrency}
          maxUnits={maxUnits}
          hasSufficientBalance={hasSufficientBalance}
        />

        {/* === Opciones avanzadas (SL/TP) === */}
        <div className="mt-4 rounded-lg border border-white/10 bg-black/20">
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-sm"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <span className="font-medium">Opciones avanzadas</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""
                }`}
            />
          </button>

          {showAdvanced && (
            <div className="px-3 pb-3 space-y-3 text-sm">
              {/* Stop Loss */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>Orden de Stop Loss</span>
                  {slMetrics && (
                    <span
                      className={`text-[11px] ${slMetrics.pnl <= 0
                          ? "text-red-400"
                          : "text-emerald-400"
                        }`}
                    >
                      {formatCurrency(slMetrics.pnl)} (
                      {slMetrics.pct.toFixed(2)}%)
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.000001"
                  className="w-full rounded-md border border-white/10 bg-[#17171b] px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="Precio Stop Loss"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Precio al que se cerrará la operación para limitar pérdidas.
                </p>
              </div>

              {/* Take Profit */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>Orden de Take Profit</span>
                  {tpMetrics && (
                    <span
                      className={`text-[11px] ${tpMetrics.pnl >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                        }`}
                    >
                      {formatCurrency(tpMetrics.pnl)} (
                      {tpMetrics.pct.toFixed(2)}%)
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.000001"
                  className="w-full rounded-md border border-white/10 bg-[#17171b] px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Precio Take Profit"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Precio al que se cerrará la operación para asegurar beneficios.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mensaje de mercado cerrado */}
        {!isMarketOpen && (
          <div className="mt-4 flex items-start gap-2 rounded-md bg-[#2a2731] px-3 py-2 text-xs text-red-200">
            <AlertCircle className="mt-[2px] h-4 w-4 flex-shrink-0" />
            <p>
              * Este activo no es negociable en este momento. El mercado se
              encuentra cerrado.
            </p>
          </div>
        )}

        {mode === "market" ? (
          <OrderPanelMarket
            symbol={symbol}
            disabled={disabledMarketAction}
            onConfirm={handleConfirmTrade}
          />
        ) : (
          <OrderPanelPending
            symbol={symbol}
            triggerPrice={triggerPrice}
            setTriggerPrice={setTriggerPrice}
            triggerRule={triggerRule}
            setTriggerRule={setTriggerRule}
            currentPrice={currentPrice}
            disabled={disabledPendingAction}
            onCreatePending={handleCreatePending}
          />
        )}

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
