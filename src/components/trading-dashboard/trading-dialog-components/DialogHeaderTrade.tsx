import { Badge } from "@/components/ui/badge";

export function DialogHeaderTrade({
  currentPrice,
  operationType,
  userBalance,
  marginEstimate,
  formatCurrency,
}: {
  currentPrice: number;
  operationType: "buy" | "sell";
  userBalance: number;
  marginEstimate: number;
  formatCurrency: (v: number, locale: string, currency: string) => string;
}) {
  const hasPrice = Number.isFinite(currentPrice);
  const hasBalance = Number.isFinite(userBalance);

  return (
    <div className="text-lg font-bold flex justify-between gap-2 mt-2">
      {/* Precio actual */}
      <div className="flex flex-col">
        <span className="text-sm font-normal mr-1">Precio actual:</span>
        <Badge
          variant="outline"
          className={operationType === "buy" ? "text-green-500" : "text-red-500"}
        >
          $ 
          {hasPrice
            // ? formatCurrency(currentPrice, "en-US", "USD")
            ? currentPrice
            : "—"}
        </Badge>
      </div>

      {/* Margen estimado */}
      <div className="flex flex-col">
        <span className="text-sm font-normal mr-1">Margen estimado:</span>
        <Badge variant="outline">
          {formatCurrency(marginEstimate, "en-US", "USD")}
        </Badge>
      </div>

      {/* Saldo disponible */}
      <div className="flex flex-col">
        <span className="text-sm font-normal mr-1">Saldo disponible:</span>
        {hasBalance ? (
          <Badge
            variant="outline"
            className={userBalance <= 0 ? "text-red-500" : "text-green-500"}
          >
            {formatCurrency(userBalance, "en-US", "USD")}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-red-500">
            —
          </Badge>
        )}
      </div>
    </div>
  );
}
