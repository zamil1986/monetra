import { translate, type Lang, type MessageKey } from "@/domain/i18n";

/*
 * Labels for a local date string ("2026-11-14"); no timezone math happens here.
 * Day and month names come from the shared catalog, so the web and the phone spell them the same.
 */
const parts = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear(), weekday: d.getUTCDay() };
};
const name = (lang: Lang, key: string) => translate(lang, key as MessageKey);

/** "Thu" / "Kam" */
export const weekday = (iso: string, lang: Lang) => name(lang, `date.wd.${parts(iso).weekday}`);
/** "19 Nov" / "19 Nov" */
export const dayMonth = (iso: string, lang: Lang) => `${parts(iso).day} ${monthShort(iso, lang)}`;
/** "November" / "November" */
export const monthLong = (iso: string, lang: Lang) => name(lang, `date.month.${parts(iso).month}`);
/** "Aug" / "Agu" */
export const monthShort = (iso: string, lang: Lang) => name(lang, `date.mon.${parts(iso).month}`);
/** "19 Nov 2026" */
export const longDate = (iso: string, lang: Lang) => `${dayMonth(iso, lang)} ${parts(iso).year}`;
/** "19 November 2026" */
export const fullDate = (iso: string, lang: Lang) => `${parts(iso).day} ${monthLong(iso, lang)} ${parts(iso).year}`;
/** "Thu 19 Nov" */
export const dayLabel = (iso: string, lang: Lang) => `${weekday(iso, lang)} ${dayMonth(iso, lang)}`;
