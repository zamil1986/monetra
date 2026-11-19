import type { TransactionType } from "./types";
import { formatRupiah } from "./money";

/** PRD 3.5: description, else category name, else "Transfer to <wallet>". */
export function transactionTitle(t: {
  type: TransactionType;
  description: string | null;
  categoryName: string | null;
  toWalletName: string | null;
}): string {
  if (t.description) return t.description;
  if (t.type === "TRANSFER") return `Transfer to ${t.toWalletName ?? "another wallet"}`;
  return t.categoryName ?? "Untitled";
}

/** How long an Akun demo has left, rounded down: "expires in 23h", "expires in 12m". */
export function demoTimeLeft(expiresAt: Date, now: Date = new Date()): string {
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return "expiring now";
  const hours = Math.floor(ms / 3_600_000);
  return hours >= 1 ? `expires in ${hours}h` : `expires in ${Math.max(1, Math.floor(ms / 60_000))}m`;
}

/** The line beside a day in the history: what was spent, else what came in, else nothing (transfers only). */
export function daySummary({ spent, received }: { spent: number; received: number }): string {
  if (spent > 0) return `${formatRupiah(spent)} spent`;
  if (received > 0) return `+${formatRupiah(received)} in`;
  return "";
}
