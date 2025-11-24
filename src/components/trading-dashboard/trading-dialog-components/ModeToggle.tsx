import { Button } from "@/components/ui/button";

type Mode = "market" | "pending";

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <>
      <Button
        variant={mode === "market" ? "default" : "outline"}
        className={mode === "market"
          ? "bg-blue-600 hover:bg-blue-700 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
        onClick={() => onChange("market")}
      >
        Mercado
      </Button>
      <Button
        variant={mode === "pending" ? "default" : "outline"}
        className={mode === "pending"
          ? "bg-amber-600 hover:bg-amber-700 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
        onClick={() => onChange("pending")}
      >
        Pendiente
      </Button>
    </>
  );
}
