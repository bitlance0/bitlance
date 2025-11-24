export type ChartType = "candlestick" | "line" | "area";
export type LoadMoreDirection = "forward" | "backward" | null;

export interface CandleData {
  time: number; // UTCTimestamp de lightweight-charts (número en segundos)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
