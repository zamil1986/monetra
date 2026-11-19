import { listTransactions } from "@/server/transactions";
import { formData } from "../form-data";
import type { FormInitial } from "../transaction-form";

/**
 * What Add transaction opens with, for both the full screen and the phone sheet:
 * Expense (or Transfer when asked), now, and the wallet used last (PRD 4.3).
 * `initial` is null when there is no active Dompet to record into.
 */
export async function loadNewTransaction(user: { id: string; timezone: string }, typeParam?: string) {
  const data = await formData(user.id, user.timezone);
  const active = data.wallets.filter((w) => !w.archived);
  const [first] = active;
  if (!first) return { data, initial: null };
  const last = (await listTransactions(user.id, { pageSize: 1 })).items[0];
  const walletId = active.find((w) => w.id === last?.walletId)?.id ?? first.id;
  const type = typeParam === "transfer" ? "TRANSFER" : "EXPENSE";
  const initial: FormInitial = {
    id: "",
    type,
    amount: 0,
    walletId,
    toWalletId: type === "TRANSFER" ? (active.find((w) => w.id !== walletId)?.id ?? null) : null,
    categoryId: null,
    description: null,
    ...data.now,
  };
  return { data, initial };
}
