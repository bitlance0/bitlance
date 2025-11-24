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
  onIntervalChange: (v: string) => void;
  onTypeChange: (v: "candlestick" | "line" | "area") => void;
  onZoom: (dir: "in" | "out" | "reset") => void;
  onRefresh: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

export default function ChartHeader({
  symbol, currentTime, currentPrice, currentInterval, intervals, chartType,
  onIntervalChange, onTypeChange, onZoom, onRefresh, disabled, isLoading
}: Props) {
  return (
    <div className="flex flex-row justify-between items-center pb-2 px-4">
      <div className="flex flex-col">
        <div className="text-white text-base relative">
          <strong>{symbol ?? "—"}</strong>
          {currentTime && currentPrice && (
            <div className="absolute top-8 left-0 lg:left-[-15px] ml-0 lg:ml-4 flex items-center z-10 no-wrap max-w-[200px] lg:max-w-2xl">
              <span className="text-sm truncate">{`${currentTime}: $${currentPrice}`}</span>
            </div>
          )}
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
