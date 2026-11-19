import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Glyph, categoryIcon } from "@/components/icons";
import { NotSignedIn } from "@/components/not-signed-in";
import { TYPE_META, TypeTag, signedAmount } from "@/components/transaction-type";
import { Notice, Page, PageHead, buttonClass, cx, h1, onlyDesktop, onlyMobile, rowFig, rowSub, rowTitle, spacer } from "@/components/ui";
import { instantToLocal } from "@/domain/local-time";
import { formatRupiah } from "@/domain/money";
import { daySummary } from "@/domain/presentation";
import { dayMonth, monthShort, weekday } from "@/lib/dates";
import { listCategories } from "@/server/categories";
import { currentUser } from "@/server/page-session";
import { transactionQuerySchema } from "@/server/schemas";
import { listTransactions, type TransactionView } from "@/server/transactions";
import { listWallets } from "@/server/wallets";
import { DeleteTransactionButton } from "./delete-transaction";
import { Filters } from "./filters";

export const metadata: Metadata = { title: "Transactions" };
export const dynamic = "force-dynamic";

type Row = TransactionView & { date: string; time: string; walletLabel: string };

const th = "whitespace-nowrap border-b border-ink py-2 pr-3 text-left text-meta font-semibold text-ink-2";
const td = "border-b border-line py-[11px] pr-3 align-middle";
/** Edit and delete wait for the pointer or keyboard focus on the row; touch screens always show them. */
const rowActions = "transition-opacity duration-150 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const user = await currentUser();
  if (!user) return <NotSignedIn />;

  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = transactionQuerySchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : {};
  const [result, { wallets }, categories] = await Promise.all([
    // A filter that can't be read shows an error rather than silently showing everything.
    parsed.success ? listTransactions(user.id, filters).catch(() => null) : null,
    listWallets(user.id),
    listCategories(user.id),
  ]);

  const head = (
    <PageHead>
      <h1 className={h1}>Transactions</h1>
      <span className={spacer} />
      <Link className={buttonClass("yellow", "md", onlyDesktop)} href="/transactions/new"><Plus />Add transaction</Link>
    </PageHead>
  );
  const filterBar = (
    <Filters
      values={filters}
      wallets={wallets.map((w) => ({ id: w.id, name: w.name, archived: w.archived }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type, archived: c.archived }))}
    />
  );

  if (!result) {
    return (
      <>
        {head}
        <Page>
          {filterBar}
          <Notice tone="danger" role="alert"><strong>Couldn&apos;t read those filters.</strong> Check the dates and try again.</Notice>
        </Page>
      </>
    );
  }

  const rows: Row[] = result.items.map((t) => ({
    ...t,
    ...instantToLocal(t.occurredAt, user.timezone),
    walletLabel: t.type === "TRANSFER" ? `${t.walletName} → ${t.toWalletName}` : t.walletName,
  }));
  const byDay = !filters.sort || filters.sort === "newest" || filters.sort === "oldest";
  const groups = byDay ? groupByDay(rows) : [{ date: null, spent: 0, received: 0, rows }];
  const first = (result.page - 1) * result.pageSize + 1;
  const last = first + rows.length - 1;
  const filtered = Object.keys(raw).length > 0;
  const pageHref = (page: number) => {
    const params = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => !!e[1]));
    params.set("page", String(page));
    return `/transactions?${params}`;
  };
  const timeOf = (t: Row, grouped: boolean) => (grouped ? t.time : `${dayMonth(t.date)} ${t.time}`);

  return (
    <>
      {head}
      <Page>
        {filterBar}
        <p className="mb-2 text-right text-meta text-ink-2">
          {result.total} {result.total === 1 ? "transaction" : "transactions"} · Income {formatRupiah(result.summary.income)} · Expense{" "}
          {formatRupiah(result.summary.expense)}
        </p>

        {rows.length === 0 ? (
          <Notice tone="info" role="status">
            <strong>{filtered ? "No transactions match." : "Nothing recorded yet."}</strong>{" "}
            {filtered ? <Link href="/transactions">Clear the filters</Link> : <Link href="/transactions/new">Record your first transaction</Link>}
          </Notice>
        ) : (
          <>
            <table className={cx("w-full border-collapse", onlyDesktop)}>
              <thead>
                <tr>
                  <th className={th}>Transaction</th><th className={th}>Category</th><th className={th}>Wallet</th><th className={th}>Type</th>
                  <th className={th}>Time</th><th className={cx(th, "pr-0 text-right")}>Amount (Rp)</th><th className={th}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => [
                  g.date && (
                    <tr key={`d-${g.date}`}>
                      <td colSpan={7} className="border-b border-line bg-panel px-2.5 py-1.5 text-meta font-semibold">
                        <DayLabel date={g.date} />
                        {daySummary(g) && <span className="text-ink-2"> · {daySummary(g)}</span>}
                      </td>
                    </tr>
                  ),
                  ...g.rows.map((t) => (
                    <tr key={t.id} className="group hover:[&>td]:bg-panel">
                      <td className={td}>
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Glyph Icon={categoryIcon(t.categoryIcon)} color={t.categoryColor} />
                          <Link className="font-medium text-inherit no-underline hover:underline" href={`/transactions/${t.id}`}>{t.title}</Link>
                        </span>
                      </td>
                      <td className={cx(td, "text-meta text-ink-2")}>{t.categoryName ?? <span aria-label="No category">–</span>}</td>
                      <td className={cx(td, "text-meta text-ink-2")}>{t.walletLabel}</td>
                      <td className={td}><TypeTag type={t.type} /></td>
                      <td className={cx(td, "text-meta text-ink-2")}>{timeOf(t, !!g.date)}</td>
                      <td className={cx(td, "fig whitespace-nowrap pr-0 text-right text-[17px]", TYPE_META[t.type].amount)}>
                        {TYPE_META[t.type].sign}{t.amount.toLocaleString("id-ID")}
                      </td>
                      <td className={cx(td, "w-[1%] whitespace-nowrap pr-0 text-right", rowActions)}>
                        <DeleteTransactionButton
                          id={t.id}
                          title={t.title}
                          meta={`${t.categoryName ?? "Transfer"} · ${t.walletLabel} · ${weekday(t.date)} ${dayMonth(t.date)} ${t.time}`}
                          amount={signedAmount(t.type, t.amount)}
                        />
                      </td>
                    </tr>
                  )),
                ])}
              </tbody>
            </table>

            <div className={onlyMobile}>
              {groups.map((g) => (
                <div key={g.date ?? "all"}>
                  {g.date && (
                    <div className="flex items-baseline gap-2 border-b border-ink pt-3.5 pb-1.5 text-meta font-semibold text-ink-2">
                      <span className="text-ink"><DayLabel date={g.date} big /></span>
                      <span className="ml-auto">{daySummary(g)}</span>
                    </div>
                  )}
                  {g.rows.map((t) => (
                    <Link
                      className="flex min-w-0 items-center gap-3 border-b border-line py-3 text-inherit no-underline hover:bg-panel"
                      href={`/transactions/${t.id}`}
                      key={t.id}
                    >
                      <Glyph Icon={categoryIcon(t.categoryIcon)} color={t.categoryColor} />
                      <span className="min-w-0 flex-1">
                        <span className={rowTitle}>{t.title}</span>
                        <span className={rowSub}>{t.categoryName ?? "Transfer"} · {t.walletLabel} · {timeOf(t, !!g.date)}</span>
                      </span>
                      <span className={cx(rowFig, TYPE_META[t.type].amount)}>{signedAmount(t.type, t.amount)}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {result.total > result.pageSize && (
          <div className="flex items-center justify-between gap-3 pt-3.5 text-sm text-ink-2">
            <span>{first}–{last} of {result.total}</span>
            <span className="flex gap-2">
              {result.page > 1 ? <Link className={buttonClass("secondary")} href={pageHref(result.page - 1)}>Previous</Link> : <button className={buttonClass("secondary")} type="button" disabled>Previous</button>}
              {last < result.total ? <Link className={buttonClass("secondary")} href={pageHref(result.page + 1)}>Next</Link> : <button className={buttonClass("secondary")} type="button" disabled>Next</button>}
            </span>
          </div>
        )}
      </Page>
    </>
  );
}

/** "Thu 19 Nov", with the day number in the calendar numeral voice. */
function DayLabel({ date, big = false }: { date: string; big?: boolean }) {
  return (
    <>
      {weekday(date)}{" "}
      <span className={cx("fig align-[-2px] text-ink", big ? "text-[26px] leading-none" : "text-xl")}>{Number(date.slice(8))}</span>{" "}
      {monthShort(date)}
    </>
  );
}

function groupByDay(rows: Row[]) {
  const groups: { date: string; spent: number; received: number; rows: Row[] }[] = [];
  for (const row of rows) {
    let g = groups.at(-1);
    if (!g || g.date !== row.date) groups.push((g = { date: row.date, spent: 0, received: 0, rows: [] }));
    g.rows.push(row);
    if (row.type === "EXPENSE") g.spent += row.amount;
    if (row.type === "INCOME") g.received += row.amount;
  }
  return groups;
}
