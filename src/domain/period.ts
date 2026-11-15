import type { DomainError } from "./errors";
import { err, ok, type Result } from "./result";

export const PERIOD_KINDS = ["today", "week", "month", "year", "custom"] as const;
export type PeriodKind = (typeof PERIOD_KINDS)[number];

/** A Periode as whole local days, both ends inclusive, in the profile timezone. */
export type Period = { kind: PeriodKind; from: string; to: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar arithmetic on local date strings; UTC is used only as a timezone-free calendar. */
const parse = (iso: string) => new Date(`${iso}T00:00:00Z`);
const format = (d: Date) => d.toISOString().slice(0, 10);
const isDate = (iso: string | undefined): iso is string => !!iso && DATE.test(iso) && format(parse(iso)) === iso;

function addDays(iso: string, days: number) {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return format(d);
}

const invalid = (field: "from" | "to", message: string): Result<never, DomainError> =>
  err({ code: "INVALID_PERIOD", message, field });

/**
 * The days a Periode covers, given today's local date (PRD 3.2).
 * This Week runs Monday to Sunday; Month and Year are whole calendar units, including days still ahead.
 */
export function resolvePeriod(
  input: { kind: PeriodKind; from?: string; to?: string },
  today: string,
): Result<Period, DomainError> {
  const [y, m] = today.split("-") as [string, string];
  switch (input.kind) {
    case "today":
      return ok({ kind: "today", from: today, to: today });
    case "week": {
      const sinceMonday = (parse(today).getUTCDay() + 6) % 7;
      const monday = addDays(today, -sinceMonday);
      return ok({ kind: "week", from: monday, to: addDays(monday, 6) });
    }
    case "month": {
      const first = `${y}-${m}-01`;
      const nextFirst = parse(first);
      nextFirst.setUTCMonth(nextFirst.getUTCMonth() + 1);
      return ok({ kind: "month", from: first, to: addDays(format(nextFirst), -1) });
    }
    case "year":
      return ok({ kind: "year", from: `${y}-01-01`, to: `${y}-12-31` });
    case "custom": {
      if (!isDate(input.from)) return invalid("from", "Pick a start date.");
      if (!isDate(input.to)) return invalid("to", "Pick an end date.");
      if (input.to < input.from) return invalid("to", "The end date can't be before the start date.");
      return ok({ kind: "custom", from: input.from, to: input.to });
    }
  }
}
