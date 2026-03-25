//src/lib/itick/itickConfig.ts
import navigation from "@/data/itick/market-navigation.json";

type ScopeKey = "US" | "GLOBAL";
type NavigationShape = {
  scopes: Record<
    ScopeKey,
    {
      label: string;
      markets: Record<string, string[]>;
    }
  >;
};

const nav = navigation as NavigationShape;

export function getScopes(): ScopeKey[] {
  return Object.keys(nav.scopes) as ScopeKey[];
}

export function getMarketsForScope(scope: ScopeKey): string[] {
  return Object.keys(nav.scopes?.[scope]?.markets ?? {});
}

export function getDefaultMarketForScope(scope: ScopeKey): string | null {
  const markets = getMarketsForScope(scope);
  return markets[0] ?? null;
}

export function getExchangesForScopeMarket(
  scope: ScopeKey,
  market: string
): string[] {
  return nav.scopes?.[scope]?.markets?.[market] ?? [];
}

export function getDefaultExchangeForScopeMarket(
  scope: ScopeKey,
  market: string
): string | null {
  const exchanges = getExchangesForScopeMarket(scope, market);
  return exchanges[0] ?? null;
}

export function isValidExchangeForSelection(
  scope: ScopeKey,
  market: string,
  exchange: string | null
): boolean {
  if (!exchange) return false;

  const exchanges: readonly string[] = getExchangesForScopeMarket(scope, market);
  return exchanges.includes(exchange);
}