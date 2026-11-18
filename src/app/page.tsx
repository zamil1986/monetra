import { ArrowDownLeft, ArrowUpRight, Equal, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Glyph, categoryIcon, walletIcon } from "@/components/icons";
import { NotSignedIn } from "@/components/not-signed-in";
import { TYPE_META, signedAmount } from "@/components/transaction-type";
import { Notice, Page, PageHead, buttonClass, cx, h1, h2, rowClass, rowFig, rowSub, rowTitle, rowsClass, spacer } from "@/components/ui";
import { instantToLocal } from "@/domain/local-time";
import { formatRupiah } from "@/domain/money";
import type { Period } from "@/domain/period";
import { dayMonth, longDate, weekday } from "@/lib/dates";
import { getDashboard, type Dashboard } from "@/server/dashboard";
import { ServiceError } from "@/server/errors";
import { currentUser } from "@/server/page-session";
import { dashboardQuerySchema } from "@/server/schemas";
import { PeriodFilter } from "./period-filter";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const PERIOD_TITLE: Record<Period["kind"], string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  year: "This year",
  custom: "Custom range",
};

const rangeLabel = ({ from, to }: Period) => (from === to ? `${weekday(from)} ${longDate(from)}` : `${dayMonth(from)} – ${longDate(to)}`);

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const user = await currentUser();
  if (!user) return <NotSignedIn />;

  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = dashboardQuerySchema.safeParse(raw);
  const asked = parsed.success ? { kind: parsed.data.period, from: parsed.data.from, to: parsed.data.to } : null;

  // A Periode that can't be read still shows the balances, which never depend on it.
  let data: Dashboard | null = null;
  let periodError: string | null = asked ? null : "That period isn't one of the choices.";
  if (asked) {
    try {
      data = await getDashboard(user.id, asked);
    } catch (e) {
      if (!(e instanceof ServiceError) || e.code !== "INVALID_PERIOD") throw e;
      periodError = e.message;
    }
  }
  data ??= await getDashboard(user.id, { kind: "month" });

  const today = instantToLocal(new Date(), user.timezone).date;
  const filterValues = periodError && asked
    ? { kind: asked.kind, from: asked.from ?? "", to: asked.to ?? "" }
    : { kind: data.period.kind, from: data.period.from, to: data.period.to };
  const net = data.netCashFlow;

  return (
    <>
      <PageHead>
        <h1 className={h1}>Dashboard</h1>
        <span className={spacer} />
        <PeriodFilter key={JSON.stringify(filterValues)} {...filterValues} />
      </PageHead>
      <Page>
        <div className="flex max-w-[760px] flex-col gap-8 md:gap-9">
          <section aria-labelledby="bal-h">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <h2 id="bal-h" className={h2}>Total balance</h2>
              <span className="text-meta text-ink-2">Current position. The period does not change it.</span>
            </div>
            <p className={cx("fig mt-1 mb-[18px] text-[52px] leading-none md:text-[72px]", data.totalBalance < 0 && "text-red")}>
              <span className="mr-[0.18em] text-[0.5em] font-bold">{data.totalBalance < 0 ? "−Rp" : "Rp"}</span>
              {Math.abs(data.totalBalance).toLocaleString("id-ID")}
            </p>
            {/* On the phone this card is the way into Wallets (PRD 4.2). */}
            <div className={rowsClass}>
              {data.wallets.map((w) => (
                <Link key={w.id} href="/wallets" className={cx(rowClass, "text-inherit no-underline hover:bg-panel")}>
                  <Glyph Icon={walletIcon(w.icon)} color={w.color} />
                  <span className={cx(rowTitle, "min-w-0 flex-1")}>{w.name}</span>
                  <span className={cx(rowFig, w.balance < 0 && "text-red")}>{formatRupiah(w.balance)}</span>
                </Link>
              ))}
            </div>
            <Link className="mt-2 inline-block text-meta font-semibold" href="/wallets">Manage wallets</Link>
          </section>

          <section aria-labelledby="flow-h">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b-2 border-ink pb-2">
              <h2 id="flow-h" className={h2}>{periodError ? "Period" : PERIOD_TITLE[data.period.kind]}</h2>
              {!periodError && <span className="text-meta text-ink-2">{rangeLabel(data.period)} · transfers not counted</span>}
            </div>
            {periodError ? (
              <Notice tone="danger" role="alert" className="mt-3"><strong>Couldn&apos;t use that period.</strong> {periodError}</Notice>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-3">
                <Figure label="Income" Icon={ArrowDownLeft} iconClass="text-green" value={formatRupiah(data.income)} />
                <Figure label="Expense" Icon={ArrowUpRight} value={formatRupiah(data.expense)} />
                <Figure
                  label="Net cash flow"
                  Icon={Equal}
                  value={`${net > 0 ? "+" : ""}${formatRupiah(net)}`}
                  valueClass={net > 0 ? "text-green" : net < 0 ? "text-red" : undefined}
                />
              </dl>
            )}
          </section>

          <section aria-labelledby="recent-h">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 id="recent-h" className={h2}>Recent transactions</h2>
              {data.hasTransactions && <Link className="text-meta font-semibold" href="/transactions">View all</Link>}
            </div>
            {data.hasTransactions ? (
              <div className={rowsClass}>
                {data.recent.map((t) => {
                  const local = instantToLocal(t.occurredAt, user.timezone);
                  const when = local.date === today ? `Today ${local.time}` : `${weekday(local.date)} ${dayMonth(local.date)} ${local.time}`;
                  const wallet = t.type === "TRANSFER" ? `${t.walletName} → ${t.toWalletName}` : t.walletName;
                  return (
                    <Link key={t.id} href={`/transactions/${t.id}`} className={cx(rowClass, "text-inherit no-underline hover:bg-panel")}>
                      <Glyph Icon={categoryIcon(t.categoryIcon)} color={t.categoryColor} />
                      <span className="min-w-0 flex-1">
                        <span className={rowTitle}>{t.title}</span>
                        <span className={rowSub}>{t.categoryName ?? "Transfer"} · {wallet} · {when}</span>
                      </span>
                      <span className={cx(rowFig, TYPE_META[t.type].amount)}>{signedAmount(t.type, t.amount)}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Notice tone="info" role="status">
                <strong>Nothing recorded yet.</strong> Income, expense and net cash flow fill in as you record transactions.
                <div className="mt-2">
                  <Link className={buttonClass("primary")} href="/transactions/new"><Plus />Record your first transaction</Link>
                </div>
              </Notice>
            )}
          </section>
        </div>
      </Page>
    </>
  );
}

function Figure(props: { label: string; Icon: typeof Equal; iconClass?: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-3 sm:flex-col sm:items-start sm:gap-1 sm:border-b-0 sm:py-4">
      <dt className="flex items-center gap-1.5 text-meta font-semibold text-ink-2 [&_svg]:size-[15px]!">
        <props.Icon className={props.iconClass} />{props.label}
      </dt>
      <dd className={cx("fig whitespace-nowrap text-xl md:text-[28px]", props.valueClass)}>{props.value}</dd>
    </div>
  );
}
