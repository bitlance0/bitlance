import { Button } from "@/components/ui/button";

export function OrderPanelMarket({
  symbol,
  disabled,
  onConfirm,
}: {
  symbol: string | null;
  disabled: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="flex gap-2 pt-2">
      {/* <Button
        variant="outline"
        className="flex-1 cursor-pointer"
        onClick={() => history.back()} // mantiene UX de cierre manual si lo usas
      >
        Cancelar
      </Button> */}
      <Button
        className="flex-1 bg-green-600 hover:bg-green-700 text-white cursor-pointer"
        onClick={onConfirm}
        disabled={disabled}
      >
        Abrir Operación | {symbol}
      </Button>
    </div>
  );
}
