import { TZDate } from "@date-fns/tz";
import { instantToLocal, localDayRange } from "./local-time";
import type { Movement } from "./types";

export const PERIODS = ["today", "week", "month", "year", "custom"] as const;
export type PeriodKind = (typeof PERIODS)[number];

export type Period = { kind: Exclude<PeriodKind, "custom"> } | { kind: "custom"; from: string; to: string };

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/**
 * The local dates a Periode covers, both inclusive, as the Pengguna sees them in their
 * profile time zone (PRD 3.2). A week runs Monday to Sunday.
 */
export function periodDates(period: Period, now: Date, timeZone: string): { from: string; to: string } {
  if (period.kind === "custom") return { from: period.from, to: period.to };
  const today = instantToLocal(now, timeZone).date;
  const [y, m] = today.split("-").map(Number) as [number, number, number];
  if (period.kind === "today") return { from: today, to: today };
  if (period.kind === "year") return { from: ymd(y, 1, 1), to: ymd(y, 12, 31) };
  if (period.kind === "month") {
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from: ymd(y, m, 1), to: ymd(y, m, lastDay) };
  }
  // Week: back to Monday, forward to Sunday. Calendar arithmetic in UTC, which has no DST.
  const z = new TZDate(now.getTime(), timeZone);
  const sinceMonday = (z.getDay() + 6) % 7;
  const base = Date.UTC(z.getFullYear(), z.getMonth(), z.getDate());
  const day = (offset: number) => new Date(base + offset * 86_400_000).toISOString().slice(0, 10);
  return { from: day(-sinceMonday), to: day(6 - sinceMonday) };
}

/** The Periode as [start, endExclusive) instants, for filtering Waktu transaksi. */
export function periodRange(period: Period, now: Date, timeZone: string) {
  const { from, to } = periodDates(period, now, timeZone);
  return { from, to, ...localDayRange(from, to, timeZone) };
}

/** Total Income, total Expense, and Net Cash Flow of the given Transaksi; Transfer counts in none. */
export function cashFlow(movements: Pick<Movement, "type" | "amount">[]) {
  let income = 0;
  let expense = 0;
  for (const m of movements) {
    if (m.type === "INCOME") income += m.amount;
    else if (m.type === "EXPENSE") expense += m.amount;
  }
  return { income, expense, net: income - expense };
}
