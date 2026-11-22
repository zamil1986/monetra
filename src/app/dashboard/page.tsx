import { ArrowDownLeft, ArrowUpRight, Equal, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Glyph, categoryIcon, hue } from "@/components/icons";
import { NotSignedIn } from "@/components/not-signed-in";
import { Rich } from "@/components/rich";
import { SpendingCalendar } from "@/components/spending-calendar";
import { TYPE_META, signedAmount } from "@/components/transaction-type";
import { Notice, Page, PageHead, chipClass, cx, h1, h2, inputClass, buttonClass, muted, rowClass, rowFig, rowSub, rowTitle, rowsClass, spacer } from "@/components/ui";
import { readDay, readMonth } from "@/domain/calendar";
import type { Lang, MessageKey } from "@/domain/i18n";
import { instantToLocal } from "@/domain/local-time";
import { formatRupiah } from "@/domain/money";
import { transactionTitle } from "@/domain/presentation";
import { PERIODS, periodDates, type Period, type PeriodKind } from "@/domain/period";
import { dayMonth, weekday } from "@/lib/dates";
import { getSpendingMonth } from "@/server/calendar";
import { getT, titled } from "@/server/i18n";
import { currentUser } from "@/server/page-session";
import { MAX_PAGE_SIZE, listTransactions } from "@/server/transactions";
import { listWallets } from "@/server/wallets";

export const generateMetadata = titled("nav.dashboard");
export const dynamic = "force-dynamic";

const LABELS: Record<PeriodKind, MessageKey> = { today: "period.today", week: "period.week", month: "period.month", year: "period.year", custom: "period.custom" };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function readPeriod(params: Record<string, string | undefined>): Period {
  const kind = PERIODS.find((p) => p === params.period) ?? "month";
  if (kind !== "custom") return { kind };
  const { from, to } = params;
  return from && to && DATE.test(from) && DATE.test(to) && from <= to ? { kind, from, to } : { kind: "month" };
}

const rangeLabel = (from: string, to: string, lang: Lang) =>
  from === to ? `${weekday(from, lang)} ${dayMonth(from, lang)}` : `${dayMonth(from, lang)} – ${dayMonth(to, lang)}`;

/** PRD 3.2, Phase 1: Total Balance, Saldo per Dompet, the Periode's cash flow, and the latest five. */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const user = await currentUser();
  if (!user) return <NotSignedIn />;
  const { t, lang } = await getT();
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const period = readPeriod(raw);
  const now = new Date();
  const { from, to } = periodDates(period, now, user.timezone);
  // The spending calendar keeps its own month and day in the URL, next to the period.
  const today = instantToLocal(now, user.timezone).date;
  const calMonth = readMonth(raw.month, today);
  const calDay = readDay(raw.day, calMonth, today);
  const calHref = (month: string, day?: string) => {
    const q = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => e[0] !== "month" && e[0] !== "day" && !!e[1]));
    q.set("month", month);
    if (day) q.set("day", day);
    return `/dashboard?${q}`;
  };

  const [{ wallets, totalBalance }, inPeriod, recent, spending, onDay] = await Promise.all([
    listWallets(user.id),
    listTransactions(user.id, { from, to, pageSize: 1 }),
    listTransactions(user.id, { pageSize: 5 }),
    getSpendingMonth(user.id, calMonth),
    calDay ? listTransactions(user.id, { from: calDay, to: calDay, sort: "oldest", pageSize: MAX_PAGE_SIZE }) : null,
  ]);
  const active = wallets.filter((w) => !w.archived);
  const { income, expense } = inPeriod.summary;
  const net = income - expense;

  const flowMax = Math.max(income, expense);
  const customOpen = period.kind === "custom";
  const activeChip = "aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper";

  return (
    <>
      {/* The phone already names the app in the cobalt band; the title stays for screen readers. */}
      <div className="max-md:sr-only"><PageHead><h1 className={h1}>{t("nav.dashboard")}</h1><span className={spacer} /></PageHead></div>
      <Page>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-10 wide:grid-cols-2 wide:gap-x-12">
          <section aria-labelledby="bal">
            <h2 id="bal" className={h2}>{t("dash.totalBalance")}</h2>
            <span className={cx("block text-meta", muted)}>{t("dash.totalBalanceSub")}</span>
            <p className={cx("fig mt-2 text-[44px] leading-none md:text-[56px]", totalBalance < 0 && "text-red")}>{formatRupiah(totalBalance)}</p>
            <div className={cx(rowsClass, "mt-4")}>
              {active.map((w) => (
                <Link key={w.id} href="/wallets" className={cx(rowClass, "text-inherit no-underline hover:bg-panel")}>
                  <i className="size-2.5 shrink-0 rounded-full" style={{ background: hue(w.color) }} aria-hidden />
                  <span className={cx(rowTitle, "flex-1")}>{w.name}</span>
                  <span className={cx(rowFig, w.balance < 0 && "text-red")}>{formatRupiah(w.balance)}</span>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="flow">
            <h2 id="flow" className={h2}>{t(LABELS[period.kind])}</h2>
            <span className={cx("block text-meta", muted)}>{t("dash.flowSub", { range: rangeLabel(from, to, lang) })}</span>
            <div className="mt-3 flex flex-wrap items-start gap-2">
              <nav aria-label={t("period.label")} className="contents">
                {PERIODS.filter((p) => p !== "custom").map((p) => (
                  <Link key={p} href={`/dashboard?period=${p}`} aria-current={period.kind === p ? "page" : undefined} className={chipClass(cx("no-underline", activeChip))}>
                    {t(LABELS[p])}
                  </Link>
                ))}
              </nav>
              {/* Custom range folds away until asked for, so the figures stay near the top on a phone. */}
              <details className="open:basis-full" open={customOpen}>
                <summary
                  className={chipClass(cx("w-fit list-none [&::-webkit-details-marker]:hidden", activeChip))}
                  aria-current={customOpen ? "page" : undefined}
                >
                  {t("period.custom")}
                </summary>
                <form className="mt-2 flex flex-wrap items-end gap-2" action="/dashboard">
                  <input type="hidden" name="period" value="custom" />
                  <label className="flex flex-col gap-1 text-meta font-semibold">{t("common.from")}<input className={inputClass(false, "w-auto")} type="date" name="from" defaultValue={from} required /></label>
                  <label className="flex flex-col gap-1 text-meta font-semibold">{t("common.to")}<input className={inputClass(false, "w-auto")} type="date" name="to" defaultValue={to} required /></label>
                  <button className={buttonClass("secondary")} type="submit">{t("dash.showRange")}</button>
                </form>
              </details>
            </div>

            <div className={cx(rowsClass, "mt-4 pt-3")}>
              {flowMax === 0 ? (
                <p className={cx("pb-3 text-sm", muted)}>{t("dash.nothingInPeriod")}</p>
              ) : (
                <div className="flex flex-col gap-3 pb-3">
                  <FlowBar Icon={ArrowDownLeft} label={t("type.INCOME")} amount={income} max={flowMax} bar="bg-green" icon="text-green" />
                  <FlowBar Icon={ArrowUpRight} label={t("type.EXPENSE")} amount={expense} max={flowMax} bar="bg-ink" />
                </div>
              )}
              <div className={cx(rowClass, "border-t")}>
                <Equal aria-hidden /><span className="flex-1 font-semibold">{t("dash.netCashFlow")}</span>
                <span className={cx(rowFig, net > 0 && "text-green", net < 0 && "text-red")}>{net > 0 ? "+" : ""}{formatRupiah(net)}</span>
              </div>
            </div>
          </section>

          <SpendingCalendar
            data={spending}
            today={today}
            day={calDay}
            dayTx={onDay && { items: onDay.items, total: onDay.total, ...onDay.summary }}
            href={calHref}
            timeZone={user.timezone}
            lang={lang}
            t={t}
          />

          <section aria-labelledby="recent" className="wide:col-span-2">
            <div className="flex items-baseline gap-3">
              <h2 id="recent" className={h2}>{t("dash.recent")}</h2>
              <span className={spacer} />
              <Link className="text-meta" href="/transactions">{t("dash.viewAll")}</Link>
            </div>
            {recent.items.length === 0 ? (
              <Notice tone="info" role="status" className="mt-3"><Rich text={t("empty.nothingYet")} tags={{ link: (c) => <Link href="/transactions/new">{c}</Link> }} /></Notice>
            ) : (
              <div className={cx(rowsClass, "mt-3")}>
                {recent.items.map((tx) => {
                  const local = instantToLocal(tx.occurredAt, user.timezone);
                  const where = tx.type === "TRANSFER" ? `${tx.walletName} → ${tx.toWalletName}` : tx.walletName;
                  return (
                    <Link key={tx.id} data-tx={tx.id} href={`/transactions/${tx.id}`} className={cx(rowClass, "text-inherit no-underline hover:bg-panel")}>
                      <Glyph Icon={categoryIcon(tx.categoryIcon)} color={tx.categoryColor} />
                      <span className="min-w-0 flex-1">
                        <span className={rowTitle}>{transactionTitle(tx, t)}</span>
                        <span className={rowSub}>{tx.categoryName ?? t("type.TRANSFER")} · {where} · {weekday(local.date, lang)} {dayMonth(local.date, lang)} {local.time}</span>
                      </span>
                      <span className={cx(rowFig, TYPE_META[tx.type].amount)}>{signedAmount(tx.type, tx.amount)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </Page>
    </>
  );
}

/** One side of the period's cash flow: label and amount as text, the bar only shows proportion. */
function FlowBar({ Icon, label, amount, max, bar, icon }: { Icon: LucideIcon; label: string; amount: number; max: number; bar: string; icon?: string }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <Icon className={icon} aria-hidden />
        <span className="flex-1 font-semibold">{label}</span>
        <span className={rowFig}>{formatRupiah(amount)}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-sm bg-panel" aria-hidden>
        <div className={cx("h-full rounded-sm", bar)} style={{ width: `${amount === 0 ? 0 : Math.max(1, (amount / max) * 100)}%` }} />
      </div>
    </div>
  );
}
