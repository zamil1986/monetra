import { ArrowDownLeft, ArrowUpRight, Equal, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Glyph, categoryIcon, hue } from "@/components/icons";
import { NotSignedIn } from "@/components/not-signed-in";
import { TYPE_META, signedAmount } from "@/components/transaction-type";
import { Notice, Page, PageHead, chipClass, cx, h1, h2, inputClass, buttonClass, muted, rowClass, rowFig, rowSub, rowTitle, rowsClass, spacer } from "@/components/ui";
import { instantToLocal } from "@/domain/local-time";
import { formatRupiah } from "@/domain/money";
import { PERIODS, periodDates, type Period, type PeriodKind } from "@/domain/period";
import { dayMonth, weekday } from "@/lib/dates";
import { currentUser } from "@/server/page-session";
import { listTransactions } from "@/server/transactions";
import { listWallets } from "@/server/wallets";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const LABELS: Record<PeriodKind, string> = { today: "Today", week: "This week", month: "This month", year: "This year", custom: "Custom" };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function readPeriod(params: Record<string, string | undefined>): Period {
  const kind = PERIODS.find((p) => p === params.period) ?? "month";
  if (kind !== "custom") return { kind };
  const { from, to } = params;
  return from && to && DATE.test(from) && DATE.test(to) && from <= to ? { kind, from, to } : { kind: "month" };
}

const rangeLabel = (from: string, to: string) => (from === to ? `${weekday(from)} ${dayMonth(from)}` : `${dayMonth(from)} – ${dayMonth(to)}`);

/** PRD 3.2, Phase 1: Total Balance, Saldo per Dompet, the Periode's cash flow, and the latest five. */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const user = await currentUser();
  if (!user) return <NotSignedIn />;
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const period = readPeriod(raw);
  const { from, to } = periodDates(period, new Date(), user.timezone);

  const [{ wallets, totalBalance }, inPeriod, recent] = await Promise.all([
    listWallets(user.id),
    listTransactions(user.id, { from, to, pageSize: 1 }),
    listTransactions(user.id, { pageSize: 5 }),
  ]);
  const active = wallets.filter((w) => !w.archived);
  const { income, expense } = inPeriod.summary;
  const net = income - expense;

  const flowMax = Math.max(income, expense);
  const customOpen = period.kind === "custom";
  const activeChip = "aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white";

  return (
    <>
      {/* The phone already names the app in the cobalt band; the title stays for screen readers. */}
      <div className="max-md:sr-only"><PageHead><h1 className={h1}>Dashboard</h1><span className={spacer} /></PageHead></div>
      <Page>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-10 wide:grid-cols-2 wide:gap-x-12">
          <section aria-labelledby="bal">
            <h2 id="bal" className={h2}>Total balance</h2>
            <span className={cx("block text-meta", muted)}>Current position. The period doesn&apos;t change it.</span>
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
            <h2 id="flow" className={h2}>{LABELS[period.kind]}</h2>
            <span className={cx("block text-meta", muted)}>{rangeLabel(from, to)} · transfers not counted</span>
            <div className="mt-3 flex flex-wrap items-start gap-2">
              <nav aria-label="Period" className="contents">
                {PERIODS.filter((p) => p !== "custom").map((p) => (
                  <Link key={p} href={`/dashboard?period=${p}`} aria-current={period.kind === p ? "page" : undefined} className={chipClass(cx("no-underline", activeChip))}>
                    {LABELS[p]}
                  </Link>
                ))}
              </nav>
              {/* Custom range folds away until asked for, so the figures stay near the top on a phone. */}
              <details className="open:basis-full" open={customOpen}>
                <summary
                  className={chipClass(cx("w-fit list-none [&::-webkit-details-marker]:hidden", activeChip))}
                  aria-current={customOpen ? "page" : undefined}
                >
                  Custom
                </summary>
                <form className="mt-2 flex flex-wrap items-end gap-2" action="/dashboard">
                  <input type="hidden" name="period" value="custom" />
                  <label className="flex flex-col gap-1 text-meta font-semibold">From<input className={inputClass(false, "w-auto")} type="date" name="from" defaultValue={from} required /></label>
                  <label className="flex flex-col gap-1 text-meta font-semibold">To<input className={inputClass(false, "w-auto")} type="date" name="to" defaultValue={to} required /></label>
                  <button className={buttonClass("secondary")} type="submit">Show range</button>
                </form>
              </details>
            </div>

            <div className={cx(rowsClass, "mt-4 pt-3")}>
              {flowMax === 0 ? (
                <p className={cx("pb-3 text-sm", muted)}>Nothing recorded in this period.</p>
              ) : (
                <div className="flex flex-col gap-3 pb-3">
                  <FlowBar Icon={ArrowDownLeft} label="Income" amount={income} max={flowMax} bar="bg-green" icon="text-green" />
                  <FlowBar Icon={ArrowUpRight} label="Expense" amount={expense} max={flowMax} bar="bg-red" />
                </div>
              )}
              <div className={cx(rowClass, "border-t")}>
                <Equal aria-hidden /><span className="flex-1 font-semibold">Net cash flow</span>
                <span className={cx(rowFig, net > 0 && "text-green", net < 0 && "text-red")}>{net > 0 ? "+" : ""}{formatRupiah(net)}</span>
              </div>
            </div>
          </section>

          <section aria-labelledby="recent" className="wide:col-span-2">
            <div className="flex items-baseline gap-3">
              <h2 id="recent" className={h2}>Recent transactions</h2>
              <span className={spacer} />
              <Link className="text-meta" href="/transactions">View all</Link>
            </div>
            {recent.items.length === 0 ? (
              <Notice tone="info" role="status" className="mt-3"><strong>Nothing recorded yet.</strong> <Link href="/transactions/new">Record your first transaction</Link></Notice>
            ) : (
              <div className={cx(rowsClass, "mt-3")}>
                {recent.items.map((t) => {
                  const local = instantToLocal(t.occurredAt, user.timezone);
                  const where = t.type === "TRANSFER" ? `${t.walletName} → ${t.toWalletName}` : t.walletName;
                  return (
                    <Link key={t.id} href={`/transactions/${t.id}`} className={cx(rowClass, "text-inherit no-underline hover:bg-panel")}>
                      <Glyph Icon={categoryIcon(t.categoryIcon)} color={t.categoryColor} />
                      <span className="min-w-0 flex-1">
                        <span className={rowTitle}>{t.title}</span>
                        <span className={rowSub}>{t.categoryName ?? "Transfer"} · {where} · {weekday(local.date)} {dayMonth(local.date)} {local.time}</span>
                      </span>
                      <span className={cx(rowFig, TYPE_META[t.type].amount)}>{signedAmount(t.type, t.amount)}</span>
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
