"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ZoomIn, ZoomOut, RotateCcw, RefreshCw } from "lucide-react";
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

export default function DesktopControls({
  disabled, currentInterval, intervals, chartType,
  onIntervalChange, onTypeChange, onZoom, onRefresh, isLoading
}: Props) {
  return (
    <div className="hidden xl:flex items-center gap-3">
      <div className="flex items-center gap-2">
        {/* <Label htmlFor="interval" className="text-white text-sm">Intervalo:</Label> */}
        <Select value={currentInterval} onValueChange={onIntervalChange} disabled={disabled}>
          <SelectTrigger id="interval" className="w-[120px] bg-[#0b1d37] border-[#2e5b8c] text-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0b1d37] text-white border-[#2e5b8c]">
            {intervals.map((i) => (<SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        {/* <Label htmlFor="chartType" className="text-white text-sm">Tipo:</Label> */}
        <Select value={chartType} onValueChange={(v) => onTypeChange(v as ChartType)} disabled={disabled}>
          <SelectTrigger id="chartType" className="w-[130px] bg-[#0b1d37] border-[#2e5b8c] text-white text-sm">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent className="bg-[#0b1d37] text-white border-[#2e5b8c]">
            <SelectItem value="candlestick">Candlestick</SelectItem>
            <SelectItem value="line">Línea</SelectItem>
            <SelectItem value="area">Área</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="bg-[#10294a] text-white border-[#2e5b8c] hover:bg-[#153b6e]"
          onClick={() => onZoom("in")} disabled={disabled || isLoading}>
          <ZoomIn className="w-4 h-4 mr-1" />
        </Button>
        <Button variant="outline" size="sm" className="bg-[#10294a] text-white border-[#2e5b8c] hover:bg-[#153b6e]"
          onClick={() => onZoom("out")} disabled={disabled || isLoading}>
          <ZoomOut className="w-4 h-4 mr-1" />
        </Button>
        <Button variant="secondary" size="sm" className="bg-[#153b6e] text-white hover:bg-[#1d4d8a]"
          onClick={() => onZoom("reset")} disabled={disabled || isLoading}>
          <RotateCcw className="w-4 h-4 mr-1" />
        </Button>
        <Button variant="outline" size="sm" className="bg-[#10294a] text-white border-[#2e5b8c] hover:bg-[#153b6e]"
          onClick={onRefresh} disabled={disabled || isLoading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </div>
  );
}
