import { Button } from "@/components/ui/button";

export function SideToggle({
  side,
  onChange,
  disableSell,
}: {
  side: "buy" | "sell";
  onChange: (s: "buy" | "sell") => void;
  disableSell?: boolean;
}) {
  return (
    <>
      <Button
        variant={side === "buy" ? "default" : "outline"}
        className={`${side === "buy"
          ? "bg-green-600 hover:bg-green-700 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          } transition-colors duration-200 cursor-pointer`}
        onClick={() => onChange("buy")}
      >
        Comprar
      </Button>
      <Button
        variant={side === "sell" ? "default" : "outline"}
        className={`${side === "sell"
          ? "bg-red-600 hover:bg-red-700 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          } transition-colors duration-200 cursor-pointer`}
        onClick={() => onChange("sell")}
        // disabled={disableSell}
      >
        Vender
      </Button>
    </>
  );
}
