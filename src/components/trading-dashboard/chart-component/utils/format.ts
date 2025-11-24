export function formatPrice(price: number, symbol?: string | null): string {
  return symbol && symbol.length === 6 ? price.toFixed(5) : price.toFixed(2);
}
