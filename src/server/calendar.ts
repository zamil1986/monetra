import { bucketByDay, monthBounds, type DayTotals } from "@/domain/calendar";
import { localDayRange } from "@/domain/local-time";
import { db } from "./db";
import { ServiceError } from "./errors";

export type SpendingMonth = {
  month: string;
  /** Local date → what was spent and received that day. Days without a Transaksi are absent. */
  days: Record<string, DayTotals>;
  /** Expense over the whole month; Transfer never counts. */
  spent: number;
  /** The day with the most Expense, or null in a month without any. */
  biggest: { date: string; expense: number } | null;
};

/** Expense and Income per local day of a "YYYY-MM" month, in the profile timezone (spending calendar). */
export async function getSpendingMonth(userId: string, month: string): Promise<SpendingMonth> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  if (!user) throw ServiceError.notFound("user");

  const { first, last } = monthBounds(month);
  const { start, endExclusive } = localDayRange(first, last, user.timezone);
  const rows = await db.transaction.findMany({
    where: { userId, deletedAt: null, occurredAt: { gte: start, lt: endExclusive } },
    select: { type: true, amount: true, occurredAt: true },
  });
  const days = bucketByDay(rows.map((r) => ({ ...r, amount: Number(r.amount) })), user.timezone);

  let spent = 0;
  let biggest: SpendingMonth["biggest"] = null;
  for (const [date, { expense }] of Object.entries(days)) {
    spent += expense;
    if (expense > 0 && (!biggest || expense > biggest.expense)) biggest = { date, expense };
  }
  return { month, days, spent, biggest };
}
