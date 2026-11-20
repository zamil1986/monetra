/*
 * The spending calendar on the Dashboard: one month of local days, Monday first, with what was
 * spent and received on each. Every date here is a local date in the profile timezone.
 */
import type { Lang } from "./i18n";
import { instantToLocal } from "./local-time";
import type { TransactionType } from "./types";

const MONTH = /^(\d{4})-(\d{2})$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-20" → "2026-11" */
export const monthOf = (date: string) => date.slice(0, 7);

/** Days in a "YYYY-MM" month. */
const daysIn = (month: string) => {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** First and last local date of a "YYYY-MM" month. */
export function monthBounds(month: string): { first: string; last: string } {
  return { first: `${month}-01`, last: `${month}-${pad(daysIn(month))}` };
}

/** The month `delta` months away: shiftMonth("2026-01", -1) is "2025-12". */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** The month asked for in the URL, or the current one when it is missing, malformed or in the future. */
export function readMonth(raw: string | undefined, today: string): string {
  const current = monthOf(today);
  const m = raw ? MONTH.exec(raw) : null;
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return current;
  return raw! <= current ? raw! : current;
}

/**
 * The selected day: a real date inside `month` and not after today. Without one, today is
 * selected when looking at the current month, and nothing in any other month.
 */
export function readDay(raw: string | undefined, month: string, today: string): string | null {
  const d = raw ? DATE.exec(raw) : null;
  if (d && monthOf(raw!) === month && Number(d[3]) >= 1 && Number(d[3]) <= daysIn(month) && raw! <= today) return raw!;
  return monthOf(today) === month ? today : null;
}

/** The month as rows of seven, Monday first; `null` pads the days before the 1st and after the last. */
export function monthGrid(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const days = daysIn(month);
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(`${month}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export type DayTotals = { expense: number; income: number; count: number };
type Movement = { type: TransactionType; amount: number; occurredAt: Date };

/** Expense and Income per local day. A Transfer counts as a transaction on its day but moves neither total. */
export function bucketByDay(movements: Movement[], timeZone: string): Record<string, DayTotals> {
  const days: Record<string, DayTotals> = {};
  for (const { type, amount, occurredAt } of movements) {
    const date = instantToLocal(occurredAt, timeZone).date;
    const day = (days[date] ??= { expense: 0, income: 0, count: 0 });
    day.count += 1;
    if (type === "EXPENSE") day.expense += amount;
    else if (type === "INCOME") day.income += amount;
  }
  return days;
}

/**
 * The amount a full-width bar stands for: a little above the 85th-percentile spending day,
 * so one rent day draws a full bar without flattening every ordinary day next to it.
 */
export function barCap(values: number[]): number {
  const spent = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (spent.length === 0) return 1;
  return spent[Math.min(spent.length - 1, Math.floor(spent.length * 0.85))]! * 1.15;
}

/** Bar width in percent, at least 2 so a small day still shows a mark. */
export const barWidth = (value: number, cap: number) => (value <= 0 ? 0 : Math.max(2, Math.min(100, Math.round((value / cap) * 100))));

/** A short amount for a narrow day cell: "18K", "1.25M" in English, "18rb", "1,25jt" in Indonesian. */
export function compactRupiah(value: number, lang: Lang): string {
  const n = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  const thousands = Math.round(n / 1000);
  if (n < 1000) return `${sign}${n}`;
  if (thousands < 1000) return `${sign}${thousands}${lang === "id" ? "rb" : "K"}`;
  const [unit, size] = n >= 999_995_000 ? [lang === "id" ? "M" : "B", 1e9] : [lang === "id" ? "jt" : "M", 1e6];
  const figure = String(Number((n / size).toFixed(2)));
  return `${sign}${lang === "id" ? figure.replace(".", ",") : figure}${unit}`;
}
