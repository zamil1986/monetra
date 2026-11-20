import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Glyph, categoryIcon, hue } from "@/components/icons";
import { Rich } from "@/components/rich";
import { TYPE_META, signedAmount } from "@/components/transaction-type";
import { cx, muted, rowClass, rowFig, rowSub, rowTitle, rowsClass } from "@/components/ui";
import { barCap, barWidth, compactRupiah, monthBounds, monthGrid, monthOf, shiftMonth } from "@/domain/calendar";
import type { Lang, Translate } from "@/domain/i18n";
import { instantToLocal } from "@/domain/local-time";
import { formatRupiah } from "@/domain/money";
import { transactionTitle } from "@/domain/presentation";
import { dayLabel, monthLong, weekday } from "@/lib/dates";
import type { SpendingMonth } from "@/server/calendar";
import type { TransactionView } from "@/server/transactions";

type Props = {
  data: SpendingMonth;
  today: string;
  /** The selected local date, or null when none is (a past month before a tap). */
  day: string | null;
  /** That day's Transaksi, oldest first, with the day's totals. */
  dayTx: { items: TransactionView[]; total: number; income: number; expense: number } | null;
  /** Dashboard URL for a month and, optionally, a day, keeping the rest of the page's state. */
  href: (month: string, day?: string) => string;
  timeZone: string;
  lang: Lang;
  t: Translate;
};

/* Weekday headers, Monday first: 2026-11-02 is a Monday. */
const WEEK = ["02", "03", "04", "05", "06", "07", "08"].map((d) => `2026-11-${d}`);

/**
 * The spending calendar: the month as a wall-calendar sheet, one cell per day with what was spent,
 * then the selected day's Transaksi. Renders two grid children so the Dashboard can set them side by side.
 */
export function SpendingCalendar({ data, today, day, dayTx, href, timeZone, lang, t }: Props) {
  const { month, days, spent, biggest } = data;
  const { first } = monthBounds(month);
  const monthName = `${monthLong(first, lang)} ${month.slice(0, 4)}`;
  const isCurrent = month === monthOf(today);
  const cap = barCap(Object.values(days).map((d) => d.expense));
  const arrow = "inline-grid size-9 place-items-center rounded border border-ink text-ink no-underline transition-colors duration-150 ease-out-expo hover:bg-panel";

  return (
    <>
      <section aria-labelledby="cal-h" className="min-w-0">
        <div className="flex items-center gap-3">
          <h2 id="cal-h" className="fig text-[28px] leading-none font-black uppercase md:text-[30px]">{monthName}</h2>
          <nav aria-label={t("cal.label")} className="ml-auto flex gap-1.5">
            <Link href={href(shiftMonth(month, -1))} scroll={false} className={arrow} aria-label={t("cal.prev")}>
              <ChevronLeft aria-hidden />
            </Link>
            {isCurrent ? (
              <span className={cx(arrow, "cursor-not-allowed border-line text-ink-3 hover:bg-transparent hover:text-ink-3")} aria-disabled="true" role="link" aria-label={t("cal.next")}>
                <ChevronRight aria-hidden />
              </span>
            ) : (
              <Link href={href(shiftMonth(month, 1))} scroll={false} className={arrow} aria-label={t("cal.next")}>
                <ChevronRight aria-hidden />
              </Link>
            )}
          </nav>
        </div>
        <p className={cx("mt-1.5 text-meta", muted)}>
          {spent === 0 ? (
            t("cal.noSpending", { month: monthName })
          ) : (
            <>
              <Rich text={t("cal.spent", { amount: formatRupiah(spent), month: monthLong(first, lang) })} tags={{ b: (c) => <strong className="text-ink">{c}</strong> }} />
              {biggest && (
                <>
                  {" · "}
                  <Rich text={t("cal.biggest", { day: dayLabel(biggest.date, lang), amount: formatRupiah(biggest.expense) })} tags={{ b: (c) => <strong className="text-ink">{c}</strong> }} />
                </>
              )}
            </>
          )}
        </p>

        <div className="mt-3 grid grid-cols-7 border-t-2 border-l border-ink border-l-line">
          {WEEK.map((d) => (
            <div key={d} className="border-r border-b border-line px-1.5 py-1 text-xs font-bold text-ink-2" aria-hidden>
              {weekday(d, lang)}
            </div>
          ))}
          {monthGrid(month).map((date, i) => {
            if (!date) return <div key={`b${i}`} className="border-r border-b border-line bg-panel" aria-hidden />;
            const n = Number(date.slice(8));
            const cell = "relative flex h-[54px] min-w-0 flex-col border-r border-b border-line px-1.5 pt-1 pb-1.5 md:h-[72px]";
            if (date > today) {
              return (
                <div key={date} className={cell}>
                  <span className="fig text-[19px] leading-none font-medium text-ink-3 md:text-[26px]">{n}</span>
                </div>
              );
            }
            const totals = days[date];
            const expense = totals?.expense ?? 0;
            const came = (totals?.income ?? 0) > 0;
            const isToday = date === today;
            const selected = date === day;
            const label = [t("cal.cell", { date: dayLabel(date, lang), amount: formatRupiah(expense) }), came && t("cal.cellIn"), isToday && t("period.today")]
              .filter(Boolean)
              .join(", ");
            return (
              <Link
                key={date}
                href={href(month, date)}
                scroll={false}
                aria-label={label}
                aria-current={selected ? "date" : undefined}
                className={cx(
                  cell,
                  "text-ink no-underline transition-[background-color,box-shadow] duration-150 ease-out-expo",
                  isToday ? "bg-yellow" : "hover:bg-panel",
                  selected && "shadow-[inset_0_0_0_2px_var(--color-ink)]",
                )}
              >
                <span className="fig text-[19px] leading-none font-black md:text-[26px]">{n}</span>
                {came && <span className="absolute top-0.5 right-1 text-xs font-extrabold text-green md:top-1 md:right-1.5" aria-hidden>+</span>}
                <span className={cx("fig mt-auto truncate text-[11px] font-semibold md:text-xs", isToday ? "text-ink" : "text-ink-2")} aria-hidden>
                  {expense === 0 ? "–" : (
                    <>
                      <span className="md:hidden">{compactRupiah(expense, lang)}</span>
                      <span className="max-md:hidden">{expense.toLocaleString("id-ID")}</span>
                    </>
                  )}
                </span>
                {expense > 0 && <span className="mt-0.5 block h-1 bg-ink" style={{ width: `${barWidth(expense, cap)}%` }} aria-hidden />}
              </Link>
            );
          })}
        </div>

        <div className={cx("mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-meta", muted)} aria-hidden>
          <span className="inline-flex items-center gap-1.5"><i className="block h-1 w-3.5 bg-ink" />{t("cal.keyBar")}</span>
          <span className="inline-flex items-center gap-1.5"><b className="font-extrabold text-green">+</b>{t("cal.keyIn")}</span>
          <span className="inline-flex items-center gap-1.5"><i className="block size-2.5 border border-ink/25 bg-yellow" />{t("period.today")}</span>
        </div>
      </section>

      <section aria-labelledby="day-h" aria-live="polite" className="min-w-0">
        {!day || !dayTx ? (
          <>
            <h2 id="day-h" className="sr-only">{t("cal.label")}</h2>
            <p className={cx(rowsClass, "pt-3 text-sm", muted)}>{t("cal.selectDay")}</p>
          </>
        ) : (
          <DayDetail day={day} dayTx={dayTx} timeZone={timeZone} lang={lang} t={t} />
        )}
      </section>
    </>
  );
}

function DayDetail({ day, dayTx, timeZone, lang, t }: { day: string; dayTx: NonNullable<Props["dayTx"]>; timeZone: string; lang: Lang; t: Translate }) {
  const { items, total, income, expense } = dayTx;
  const strong = { b: (c: ReactNode) => <strong className="text-ink">{c}</strong> };
  const strongIn = { b: (c: ReactNode) => <strong className="text-green">+{c}</strong> };

  // What the day's money went to, biggest first.
  const byCategory = new Map<string, { name: string; color: string | null; amount: number }>();
  for (const tx of items) {
    if (tx.type !== "EXPENSE") continue;
    const key = tx.categoryId ?? "";
    const entry = byCategory.get(key) ?? { name: tx.categoryName ?? "", color: tx.categoryColor, amount: 0 };
    entry.amount += tx.amount;
    byCategory.set(key, entry);
  }
  const categories = [...byCategory.values()].sort((a, b) => b.amount - a.amount);

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t-2 border-ink pt-3">
        <h2 id="day-h" className="fig text-2xl leading-none font-black uppercase">{dayLabel(day, lang)}</h2>
        <span className={cx("text-meta", muted)}>
          <Rich text={t("cal.daySpent", { amount: formatRupiah(expense) })} tags={strong} />
          {income > 0 && <>{" · "}<Rich text={t("cal.dayIn", { amount: formatRupiah(income) })} tags={strongIn} /></>}
          {" · "}{t("tx.count", { count: total })}
        </span>
        {total > 0 && <Link className="ml-auto text-meta" href={`/transactions?from=${day}&to=${day}`}>{t("cal.openDay")}</Link>}
      </div>

      {categories.length > 0 && (
        <ul className={cx("mt-2 flex flex-wrap gap-x-4 gap-y-1 text-meta", muted)}>
          {categories.map((c) => (
            <li key={c.name} className="inline-flex items-center gap-1.5">
              <i className="size-2 rounded-full" style={{ background: hue(c.color) }} aria-hidden />
              {c.name} <span className="fig text-sm text-ink">{formatRupiah(c.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 ? (
        <p className={cx("mt-3 text-sm", muted)}>{t("cal.nothingOnDay")}</p>
      ) : (
        <div className="mt-2">
          {items.map((tx) => {
            const where = tx.type === "TRANSFER" ? `${tx.walletName} → ${tx.toWalletName}` : tx.walletName;
            return (
              <Link key={tx.id} href={`/transactions/${tx.id}`} className={cx(rowClass, "text-inherit no-underline hover:bg-panel")}>
                <Glyph Icon={categoryIcon(tx.categoryIcon)} color={tx.categoryColor} />
                <span className="min-w-0 flex-1">
                  <span className={rowTitle}>{transactionTitle(tx, t)}</span>
                  <span className={rowSub}>{tx.categoryName ?? t("type.TRANSFER")} · {where} · {instantToLocal(tx.occurredAt, timeZone).time}</span>
                </span>
                <span className={cx(rowFig, TYPE_META[tx.type].amount)}>{signedAmount(tx.type, tx.amount)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
