export const MIN_WITHDRAWAL_USD = 10;

export const WITHDRAWAL_METHODS = [
  { value: "wallet", label: "Wallet" },
  { value: "bank_transfer", label: "Transferencia" },
  { value: "cash", label: "Efectivo" },
] as const;

export type WithdrawalMethod = (typeof WITHDRAWAL_METHODS)[number]["value"];

export function getWithdrawalMethodLabel(method?: string | null) {
  switch (method) {
    case "wallet":
      return "Wallet";
    case "bank_transfer":
      return "Transferencia";
    case "cash":
      return "Efectivo";
    default:
      return "Por definir";
  }
}
