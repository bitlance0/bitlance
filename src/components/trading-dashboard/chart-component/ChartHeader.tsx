"use client";

import DesktopControls from "./DesktopControls";
import MobileMenu from "./MobileMenu";

type Props = {
  symbol?: string | null;
  currentTime?: string;
  currentPrice?: string;
  currentInterval: string;
  intervals: readonly { value: string; label: string }[];
  chartType: "candlestick" | "line" | "area";
  onIntervalChange: (value: string) => void;
  onTypeChange: (value: "candlestick" | "line" | "area") => void;
  onZoom: (direction: "in" | "out" | "reset") => void;
  onRefresh: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

export default function ChartHeader({
  symbol,
  currentTime,
  currentPrice,
  currentInterval,
  intervals,
  chartType,
  onIntervalChange,
  onTypeChange,
  onZoom,
  onRefresh,
  disabled,
  isLoading,
}: Props) {
  return (
    <div className="flex flex-row items-center justify-between px-4 pb-2">
      <div className="flex flex-col">
        <div className="relative text-base text-white">
          <strong>{symbol ?? "—"}</strong>
          {isLoading ? (
            <span className="ml-2 inline-flex items-center gap-1 rounded border border-blue-400/40 bg-blue-900/30 px-2 py-0.5 text-[11px] text-blue-100">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-300" />
              Consultando...
            </span>
          ) : null}

          {currentTime && currentPrice ? (
            <div className="no-wrap absolute top-8 left-0 z-10 ml-0 flex max-w-[200px] items-center lg:left-[-15px] lg:ml-4 lg:max-w-2xl">
              <span className="truncate text-sm">{`${currentTime}: $${currentPrice}`}</span>
            </div>
          ) : null}
        </div>
      </div>

      <MobileMenu
        disabled={disabled}
        currentInterval={currentInterval}
        intervals={intervals}
        chartType={chartType}
        onIntervalChange={onIntervalChange}
        onTypeChange={onTypeChange}
        onZoom={onZoom}
        onRefresh={onRefresh}
        isLoading={isLoading}
      />

      <DesktopControls
        disabled={disabled}
        currentInterval={currentInterval}
        intervals={intervals}
        chartType={chartType}
        onIntervalChange={onIntervalChange}
        onTypeChange={onTypeChange}
        onZoom={onZoom}
        onRefresh={onRefresh}
        isLoading={isLoading}
      />
    </div>
  );
}
