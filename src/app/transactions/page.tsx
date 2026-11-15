import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Glyph, categoryIcon } from "@/components/icons";
import { NotSignedIn } from "@/components/not-signed-in";
import { TYPE_META, TypeTag, signedAmount } from "@/components/transaction-type";
import { instantToLocal } from "@/domain/local-time";
import { formatRupiah } from "@/domain/money";
import { dayMonth, monthLong, monthShort, weekday } from "@/lib/dates";
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
    <div className="page-head">
      <h1>Transactions</h1>
      <span className="spacer" />
      <Link className="btn only-desktop" href="/transactions/new"><Plus />Add transaction</Link>
    </div>
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
      <>{head}<main className="page">{filterBar}
        <div className="notice danger" role="alert"><div><strong>Couldn&apos;t read those filters.</strong> Check the dates and try again.</div></div>
      </main></>
    );
  }

  const rows: Row[] = result.items.map((t) => ({
    ...t,
    ...instantToLocal(t.occurredAt, user.timezone),
    walletLabel: t.type === "TRANSFER" ? `${t.walletName} → ${t.toWalletName}` : t.walletName,
  }));
  const byDay = !filters.sort || filters.sort === "newest" || filters.sort === "oldest";
  const groups = byDay ? groupByDay(rows) : [{ date: null, spent: 0, rows }];
  const first = (result.page - 1) * result.pageSize + 1;
  const last = first + rows.length - 1;
  const pageHref = (page: number) => {
    const params = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => !!e[1]));
    params.set("page", String(page));
    return `/transactions?${params}`;
  };

  return (
    <>
      {head}
      <main className="page">
        {filterBar}
        <div className="applied">
          <span className="muted" style={{ marginLeft: "auto" }}>
            {result.total} {result.total === 1 ? "transaction" : "transactions"} · Income {formatRupiah(result.summary.income)} · Expense {formatRupiah(result.summary.expense)}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="notice info" role="status">
            <div>
              <strong>{result.total === 0 && Object.keys(raw).length === 0 ? "Nothing recorded yet." : "No transactions match."}</strong>{" "}
              {Object.keys(raw).length === 0 ? <Link href="/transactions/new">Record your first transaction</Link> : <Link href="/transactions">Clear the filters</Link>}
            </div>
          </div>
        ) : (
          <>
            <table className="tbl only-desktop">
              <thead>
                <tr><th>Transaction</th><th>Category</th><th>Wallet</th><th>Type</th><th>Time</th><th className="num">Amount (Rp)</th><th><span className="sr">Actions</span></th></tr>
              </thead>
              <tbody>
                {groups.map((g) => [
                  g.date && (
                    <tr className="day" key={`d-${g.date}`}>
                      <td colSpan={7}><span className="fig">{Number(g.date.slice(8))}</span>{weekday(g.date)}, {monthLong(g.date)} · {formatRupiah(g.spent)} spent</td>
                    </tr>
                  ),
                  ...g.rows.map((t) => (
                    <tr key={t.id}>
                      <td><span className="title-cell"><Glyph Icon={categoryIcon(t.categoryIcon)} color={t.categoryColor} /><Link href={`/transactions/${t.id}`}>{t.title}</Link></span></td>
                      <td className="sub">{t.categoryName ?? <span aria-label="No category">–</span>}</td>
                      <td className="sub">{t.walletLabel}</td>
                      <td><TypeTag type={t.type} /></td>
                      <td className="sub">{g.date ? t.time : `${dayMonth(t.date)} ${t.time}`}</td>
                      <td className={`num fig ${TYPE_META[t.type].amountCss}`}>{TYPE_META[t.type].sign}{t.amount.toLocaleString("id-ID")}</td>
                      <td className="act">
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

            <div className="only-mobile">
              {groups.map((g) => (
                <div key={g.date ?? "all"}>
                  {g.date && (
                    <div className="day-head"><span className="fig">{Number(g.date.slice(8))}</span>{weekday(g.date)}, {monthShort(g.date)}<span className="sum">{formatRupiah(g.spent)} spent</span></div>
                  )}
                  {g.rows.map((t) => (
                    <Link className="row" href={`/transactions/${t.id}`} key={t.id}>
                      <Glyph Icon={categoryIcon(t.categoryIcon)} color={t.categoryColor} />
                      <span className="grow"><span className="t">{t.title}</span><span className="s">{t.categoryName ?? "Transfer"} · {t.walletLabel} · {g.date ? t.time : `${dayMonth(t.date)} ${t.time}`}</span></span>
                      <span className={`fig ${TYPE_META[t.type].amountCss}`}>{signedAmount(t.type, t.amount)}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {result.total > result.pageSize && (
          <div className="pager">
            <span>{first}–{last} of {result.total}</span>
            <span>
              {result.page > 1 ? <Link className="btn secondary" href={pageHref(result.page - 1)}>Previous</Link> : <button className="btn secondary" type="button" disabled>Previous</button>}{" "}
              {last < result.total ? <Link className="btn secondary" href={pageHref(result.page + 1)}>Next</Link> : <button className="btn secondary" type="button" disabled>Next</button>}
            </span>
          </div>
        )}
      </main>
    </>
  );
}

function groupByDay(rows: Row[]) {
  const groups: { date: string; spent: number; rows: Row[] }[] = [];
  for (const row of rows) {
    let g = groups.at(-1);
    if (!g || g.date !== row.date) groups.push((g = { date: row.date, spent: 0, rows: [] }));
    g.rows.push(row);
    if (row.type === "EXPENSE") g.spent += row.amount;
  }
  return groups;
}
