export const VALID_INTERVALS = [
  { value: "1min",  label: "1 Minuto" },
  { value: "5min",  label: "5 Minutos" },
  { value: "15min", label: "15 Minutos" },
  { value: "30min", label: "30 Minutos" },
  { value: "60min", label: "1 Hora" },
] as const;

export function validateInterval(int?: string): string {
  const v = int ?? "5min";
  return VALID_INTERVALS.some(i => i.value === v) ? v : "5min";
}

export function getIntervalInSeconds(interval: string): number {
  switch (interval) {
    case "1min":  return 60;
    case "5min":  return 5 * 60;
    case "15min": return 15 * 60;
    case "30min": return 30 * 60;
    case "60min": return 60 * 60;
    default:      return 5 * 60;
  }
}
