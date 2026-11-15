import type { TransactionType } from "./types";

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
