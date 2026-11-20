import type { TransactionType } from "./types";
import { tEn, type Translate } from "./i18n";
import { formatRupiah } from "./money";

/** PRD 3.5: description, else category name, else "Transfer to <wallet>". */
export function transactionTitle(
  t: {
    type: TransactionType;
    description: string | null;
    categoryName: string | null;
    toWalletName: string | null;
  },
  tr: Translate = tEn,
): string {
  if (t.description) return t.description;
  if (t.type === "TRANSFER") return tr("tx.transferTo", { wallet: t.toWalletName ?? tr("tx.anotherWallet") });
  return t.categoryName ?? tr("tx.untitled");
}

/** How long an Akun demo has left, rounded down: "expires in 23h", "expires in 12m". */
export function demoTimeLeft(expiresAt: Date, now: Date = new Date(), tr: Translate = tEn): string {
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return tr("demo.left.now");
  const hours = Math.floor(ms / 3_600_000);
  return hours >= 1 ? tr("demo.left.hours", { n: hours }) : tr("demo.left.minutes", { n: Math.max(1, Math.floor(ms / 60_000)) });
}

/** The line beside a day in the history: what was spent, else what came in, else nothing (transfers only). */
export function daySummary({ spent, received }: { spent: number; received: number }, tr: Translate = tEn): string {
  if (spent > 0) return tr("day.spent", { amount: formatRupiah(spent) });
  if (received > 0) return tr("day.in", { amount: formatRupiah(received) });
  return "";
}
