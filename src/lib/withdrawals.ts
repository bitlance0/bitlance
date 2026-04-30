import { createHash } from "crypto";
export {
  MIN_WITHDRAWAL_USD,
  WITHDRAWAL_METHODS,
  getWithdrawalMethodLabel,
  type WithdrawalMethod,
} from "@/lib/withdrawal-shared";

function hashToken(input: string) {
  return createHash("sha256").update(input).digest("hex").toUpperCase();
}

export function buildWithdrawalReference(withdrawalId: string) {
  const token = hashToken(withdrawalId).slice(0, 12);
  return `WDR-${token.slice(0, 4)}-${token.slice(4, 8)}-${token.slice(8, 12)}`;
}

export function buildWithdrawalDestinationAddress(
  userId: string,
  accountId: string,
  withdrawalId: string
) {
  const token = hashToken(`${userId}:${accountId}:${withdrawalId}`).slice(0, 24);
  return `BLW-${token.slice(0, 6)}-${token.slice(6, 12)}-${token.slice(12, 18)}-${token.slice(18, 24)}`;
}

export function buildWithdrawalTicketReference(withdrawalId: string) {
  const token = hashToken(`ticket:${withdrawalId}`).slice(0, 10);
  return `TCK-${token.slice(0, 5)}-${token.slice(5, 10)}`;
}
