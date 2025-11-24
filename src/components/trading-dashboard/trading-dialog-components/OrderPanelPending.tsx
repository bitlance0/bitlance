import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

type TriggerRule = "gte" | "lte";

export function OrderPanelPending({
  symbol,
  triggerPrice,
  setTriggerPrice,
  triggerRule,
  setTriggerRule,
  currentPrice,
  disabled,
  onCreatePending,
}: {
  symbol: string | null;
  triggerPrice: string;
  setTriggerPrice: (v: string) => void;
  triggerRule: TriggerRule;
  setTriggerRule: (r: TriggerRule) => void;
  currentPrice: number;
  disabled: boolean;
  onCreatePending: () => void;
}) {
  return (
    <>
      <ScrollArea className="h-48 border border-[var(--color-border)] rounded-md p-3">
        <div className="grid gap-3 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Precio objetivo</Label>
              <Input
                inputMode="decimal"
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
                placeholder={currentPrice.toFixed(4)}
                className="bg-[#181a20] border-gray-700 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setTriggerPrice((currentPrice * 1.01).toFixed(4))}
                >
                  +1%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setTriggerPrice((currentPrice * 0.99).toFixed(4))}
                >
                  -1%
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Condición</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={triggerRule === "gte" ? "default" : "outline"}
                  className={triggerRule === "gte"
                    ? "h-9 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                    : "h-9 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"}
                  onClick={() => setTriggerRule("gte")}
                >
                  Al alza (≥)
                </Button>
                <Button
                  type="button"
                  variant={triggerRule === "lte" ? "default" : "outline"}
                  className={triggerRule === "lte"
                    ? "h-9 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                    : "h-9 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"}
                  onClick={() => setTriggerRule("lte")}
                >
                  A la baja (≤)
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Se activará automáticamente cuando el precio cumpla la condición.
              </p>
            </div>
          </div>

          <div className="rounded-md border border-amber-700/40 bg-amber-950/30 p-2 text-[12px] text-amber-300">
            Esta es una orden <strong>automatizada</strong>: no descuenta margen hasta que se active.
          </div>
        </div>
      </ScrollArea>

      <div className="flex gap-2 pt-2">
        {/* <Button
          variant="outline"
          className="flex-1 cursor-pointer"
          // onClick={() => setTriggerPrice("")}
        >
          Cancelar
        </Button> */}
        <Button
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
          onClick={onCreatePending}
          disabled={disabled}
          title={disabled ? "Revisa el precio objetivo y la cantidad" : ""}
        >
          Crear Orden Pendiente | {symbol}
        </Button>
      </div>
    </>
  );
}
