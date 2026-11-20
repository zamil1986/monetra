import { instantToLocal, localDayRange } from "@/domain/local-time";
import { resolvePeriod, type Period, type PeriodKind } from "@/domain/period";
import type { WalletColor, WalletIcon } from "@/domain/wallet-rules";
import { db } from "./db";
import { ServiceError } from "./errors";
import { listTransactions, type TransactionView } from "./transactions";
import { listWallets } from "./wallets";

const RECENT_COUNT = 5;

export type Dashboard = {
  period: Period;
  /** Current position of every active Dompet; never depends on the Periode. */
  totalBalance: number;
  wallets: { id: string; name: string; color: WalletColor; icon: WalletIcon; balance: number }[];
  /** Income and Expense whose Waktu transaksi falls in the Periode. Transfer is never counted. */
  income: number;
  expense: number;
  netCashFlow: number;
  /** The latest Transaksi of any type, regardless of the Periode. */
  recent: TransactionView[];
  /** False until the Pengguna records a first Transaksi, for the empty state. */
  hasTransactions: boolean;
};

/** Everything the dashboard shows, computed in the profile timezone (PRD 3.2). */
export async function getDashboard(
  userId: string,
  input: { kind: PeriodKind; from?: string; to?: string },
  now: Date = new Date(),
): Promise<Dashboard> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  if (!user) throw ServiceError.notFound("user");

  const resolved = resolvePeriod(input, instantToLocal(now, user.timezone).date);
  if (!resolved.ok) throw ServiceError.fromDomain(resolved.error);
  const period = resolved.value;
  const { start, endExclusive } = localDayRange(period.from, period.to, user.timezone);

  const [{ wallets, totalBalance }, sums, latest] = await Promise.all([
    listWallets(userId),
    db.transaction.groupBy({
      by: ["type"],
      where: { userId, deletedAt: null, type: { in: ["INCOME", "EXPENSE"] }, occurredAt: { gte: start, lt: endExclusive } },
      _sum: { amount: true },
    }),
    listTransactions(userId, { sort: "newest", pageSize: RECENT_COUNT }),
  ]);
  const sumOf = (type: "INCOME" | "EXPENSE") => Number(sums.find((s) => s.type === type)?._sum.amount ?? 0n);
  const income = sumOf("INCOME");
  const expense = sumOf("EXPENSE");

  return {
    period,
    totalBalance,
    wallets: wallets.filter((w) => !w.archived).map(({ id, name, color, icon, balance }) => ({ id, name, color, icon, balance })),
    income,
    expense,
    netCashFlow: income - expense,
    recent: latest.items,
    hasTransactions: latest.total > 0,
  };
}
