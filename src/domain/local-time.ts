import { TZDate } from "@date-fns/tz";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{2}):(\d{2})$/;

/** A wall-clock date ("2026-11-14") and time ("15:42") in `timeZone`, as one instant. Invalid Date if malformed. */
export function localToInstant(date: string, time: string, timeZone: string): Date {
  const d = DATE.exec(date);
  const t = TIME.exec(time);
  if (!d || !t) return new Date(Number.NaN);
  const [, y, mo, da] = d.map(Number) as [number, number, number, number];
  const [, h, mi] = t.map(Number) as [number, number, number];
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || h > 23 || mi > 59) return new Date(Number.NaN);
  const instant = new Date(new TZDate(y, mo - 1, da, h, mi, 0, 0, timeZone).getTime());
  // 31 February would silently become 3 March; a date that doesn't read back the same never existed.
  return instantToLocal(instant, timeZone).date === date ? instant : new Date(Number.NaN);
}

/** The date and time a person in `timeZone` sees for an instant. */
export function instantToLocal(instant: Date, timeZone: string): { date: string; time: string } {
  const z = new TZDate(instant.getTime(), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${z.getFullYear()}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}`,
    time: `${pad(z.getHours())}:${pad(z.getMinutes())}`,
  };
}

/** Whole local days `from`..`to` inclusive, as [start, endExclusive) instants. */
export function localDayRange(from: string, to: string, timeZone: string): { start: Date; endExclusive: Date } {
  const start = localToInstant(from, "00:00", timeZone);
  const lastDay = localToInstant(to, "00:00", timeZone);
  const z = new TZDate(lastDay.getTime(), timeZone);
  z.setDate(z.getDate() + 1);
  return { start, endExclusive: new Date(z.getTime()) };
}
