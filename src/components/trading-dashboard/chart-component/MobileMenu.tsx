"use client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, ZoomIn, ZoomOut, RotateCcw, RefreshCw } from "lucide-react";
import type { ChartType } from "./types";

type Props = {
  disabled?: boolean;
  currentInterval: string;
  intervals: readonly { value: string; label: string }[];
  chartType: ChartType;
  onIntervalChange: (v: string) => void;
  onTypeChange: (v: ChartType) => void;
  onZoom: (dir: "in" | "out" | "reset") => void;
  onRefresh: () => void;
  isLoading?: boolean;
};

export default function MobileMenu({
  disabled, currentInterval, intervals, chartType,
  onIntervalChange, onTypeChange, onZoom, onRefresh, isLoading
}: Props) {
  return (
    <div className="xl:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="bg-[#10294a] text-white border-[#2e5b8c] hover:bg-[#153b6e]" disabled={disabled}>
            <Menu className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-[#0b1d37] text-white border-[#2e5b8c] w-64">
          <DropdownMenuLabel className="text-white">Intervalo</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#2e5b8c]" />
          {intervals.map((it) => (
            <DropdownMenuItem key={it.value}
              className={`cursor-pointer hover:bg-[#153b6e] ${currentInterval === it.value ? "bg-[#153b6e]" : ""}`}
              onClick={() => onIntervalChange(it.value)}
            >
              {it.label}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="bg-[#2e5b8c]" />
          <DropdownMenuLabel className="text-white">Tipo de Gráfico</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#2e5b8c]" />
          {(["candlestick", "line", "area"] as ChartType[]).map((t) => (
            <DropdownMenuItem key={t}
              className={`cursor-pointer hover:bg-[#153b6e] ${chartType === t ? "bg-[#153b6e]" : ""}`}
              onClick={() => onTypeChange(t)}
            >
              {t === "candlestick" ? "Candlestick" : t === "line" ? "Línea" : "Área"}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="bg-[#2e5b8c]" />
          <DropdownMenuLabel className="text-white">Controles</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#2e5b8c]" />
          <div className="flex flex-col gap-2 p-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 bg-[#10294a] text-white border-[#2e5b8c] hover:bg-[#153b6e] text-xs"
                onClick={() => onZoom("in")} disabled={disabled || isLoading}>
                <ZoomIn className="w-3 h-3 mr-1" />
              </Button>
              <Button variant="outline" size="sm" className="flex-1 bg-[#10294a] text-white border-[#2e5b8c] hover:bg-[#153b6e] text-xs"
                onClick={() => onZoom("out")} disabled={disabled || isLoading}>
                <ZoomOut className="w-3 h-3 mr-1" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1 bg-[#153b6e] text-white hover:bg-[#1d4d8a] text-xs"
                onClick={() => onZoom("reset")} disabled={disabled || isLoading}>
                <RotateCcw className="w-3 h-3 mr-1" /> Reset
              </Button>
              <Button variant="outline" size="sm" className="flex-1 bg-[#10294a] text-white border-[#2e5b8c] hover:bg-[#153b6e] text-xs"
                onClick={onRefresh} disabled={disabled || isLoading}>
                <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Actualizar
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
