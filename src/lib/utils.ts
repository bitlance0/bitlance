// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type FormatCurrencyOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compactSmallValues?: boolean;
}

export function formatCurrency(
  value: number,
  locale = "en-US",
  currency = "USD",
  options: FormatCurrencyOptions = {}
) {
  const absValue = Math.abs(value)
  const minimumFractionDigits =
    options.minimumFractionDigits ??
    (options.compactSmallValues && absValue > 0 && absValue < 0.01 ? 4 : undefined)
  const maximumFractionDigits =
    options.maximumFractionDigits ??
    (options.compactSmallValues
      ? absValue >= 1
        ? 2
        : absValue >= 0.01
          ? 4
          : absValue > 0
            ? 6
            : 2
      : undefined)

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...(minimumFractionDigits !== undefined ? { minimumFractionDigits } : {}),
    ...(maximumFractionDigits !== undefined ? { maximumFractionDigits } : {}),
  }).format(value)
}
