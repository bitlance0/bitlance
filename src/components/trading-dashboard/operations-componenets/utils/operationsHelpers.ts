import { Trade, TradeMeta } from "./operationsTypes";

export const CURRENCY = "USD";
export const sideSign = (side: "buy" | "sell") => (side === "buy" ? 1 : -1);

export function toNum(n: any, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function getMeta(t: Trade): TradeMeta {
  if (!t.metadata) return {};
  if (typeof t.metadata === "string") {
    try {
      return JSON.parse(t.metadata) as TradeMeta;
    } catch {
      return {};
    }
  }
  return t.metadata as TradeMeta;
}
