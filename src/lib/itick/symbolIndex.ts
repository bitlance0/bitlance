// src/lib/itick/symbolIndex.ts
import fs from "node:fs";
import path from "node:path";

export type SymbolIndex = Record<string, Record<string, string[]>>;

let cachedIndex: SymbolIndex | null = null;

export function getSymbolIndex(): SymbolIndex {
  if (cachedIndex) return cachedIndex;

  const filePath = path.join(
    process.cwd(),
    "src",
    "server",
    "data",
    "itick",
    "mercados_solo_simbolos.json"
  );

  const raw = fs.readFileSync(filePath, "utf-8");
  cachedIndex = JSON.parse(raw) as SymbolIndex;

  return cachedIndex;
}

export function getSymbolsByMarketExchange(
  market: string,
  exchange: string,
  limit = 10
): string[] {
  const index = getSymbolIndex();

  const symbols = index?.[market]?.[exchange];

  if (!Array.isArray(symbols)) return [];

  return symbols.slice(0, limit);
}