import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UnitsTable({
  currentPrice,
  marginRate,
  unitOptions,
  selectedUnit,
  onSelectUnit,
  formatCurrency,
  maxUnits,
  hasSufficientBalance,
}: {
  currentPrice: number;
  marginRate: number;
  unitOptions: number[];
  selectedUnit: number;
  onSelectUnit: (u: number) => void;
  formatCurrency: (v: number, locale: string, currency: string) => string;
  maxUnits: number;
  hasSufficientBalance: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Detalles de la operación</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[200px] overflow-y-auto border border-gray-700 rounded-md">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#181a20] z-10">
              <tr className="text-gray-400 text-left border-b border-gray-700">
                <th className="py-2 px-3 font-semibold">Unidades</th>
                <th className="py-2 px-3 font-semibold">Valor total</th>
                <th className="py-2 px-3 font-semibold">Margen estimado</th>
              </tr>
            </thead>
            <tbody>
              {unitOptions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-3 px-3 text-center text-muted-foreground">
                    No hay unidades disponibles con el saldo y el margen actuales.
                  </td>
                </tr>
              ) : (
                unitOptions.map((unit) => {
                  const valor = unit * currentPrice;
                  const margen = valor * marginRate;
                  return (
                    <tr
                      key={unit}
                      className={`hover:bg-gray-800/40 cursor-pointer transition-colors ${selectedUnit === unit ? "bg-gray-800/60" : ""}`}
                      onClick={() => onSelectUnit(unit)}
                    >
                      <td className="py-2 px-3 font-medium">{unit.toLocaleString()}</td>
                      <td className="py-2 px-3">{formatCurrency(valor, "en-US", "USD")}</td>
                      <td className="py-2 px-3 text-muted-foreground">{formatCurrency(margen, "en-US", "USD")}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-400 text-center">
          Cantidad máxima disponible:{" "}
          <span className="font-semibold text-white">{maxUnits.toLocaleString()}</span> unidades
        </div>

        <div className={`text-xs text-center ${hasSufficientBalance ? "text-green-500" : "text-red-500"}`}>
          {hasSufficientBalance
            ? "✓ Saldo suficiente para abrir esta operación"
            : maxUnits <= 0
              ? "✗ Sin unidades disponibles con el saldo y margen actual"
              : "✗ Saldo insuficiente para esta operación"}
        </div>
      </CardContent>
    </Card>
  );
}
