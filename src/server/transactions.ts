import { transactionTitle } from "@/domain/presentation";
import { localDayRange } from "@/domain/local-time";
import {
  validateNewTransaction,
  validateTransactionEdit,
  type RuleContext,
  type TransactionDraft,
  type TransactionPatch,
} from "@/domain/transaction-rules";
import type { CategoryType, TransactionType } from "@/domain/types";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { ServiceError } from "./errors";
import { lockWallets } from "./wallets";

type Tx = Prisma.TransactionClient;

const withNames = {
  wallet: { select: { name: true } },
  toWallet: { select: { name: true } },
  category: { select: { name: true, icon: true, color: true } },
} satisfies Prisma.TransactionInclude;

type Row = Prisma.TransactionGetPayload<{ include: typeof withNames }>;

export type TransactionView = TransactionDraft & {
  id: string;
  title: string;
  walletName: string;
  toWalletName: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toView(row: Row): TransactionView {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    walletId: row.walletId,
    toWalletId: row.toWalletId,
    categoryId: row.categoryId,
    description: row.description,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    walletName: row.wallet.name,
    toWalletName: row.toWallet?.name ?? null,
    categoryName: row.category?.name ?? null,
    categoryIcon: row.category?.icon ?? null,
    categoryColor: row.category?.color ?? null,
    title: transactionTitle({
      type: row.type,
      description: row.description,
      categoryName: row.category?.name ?? null,
      toWalletName: row.toWallet?.name ?? null,
    }),
  };
}

/** The Dompet and Kategori the drafts name, locked and scoped to the Pengguna, as the rules see them. */
async function ruleContext(tx: Tx, userId: string, ...drafts: Partial<TransactionDraft>[]): Promise<RuleContext> {
  const present = (id: string | null | undefined): id is string => !!id;
  const walletIds = [...new Set(drafts.flatMap((d) => [d.walletId, d.toWalletId]).filter(present))];
  const categoryIds = [...new Set(drafts.map((d) => d.categoryId).filter(present))];
  // One connection per database transaction: queries run one after another, not in parallel.
  const wallets = await lockWallets(tx, userId, walletIds);
  // Shared lock: an archive of the same Kategori waits for this save, and the other way round.
  const categories = categoryIds.length
    ? await tx.$queryRaw<{ id: string; type: CategoryType; archived_at: Date | null }[]>`
        SELECT id, type, archived_at FROM categories
        WHERE user_id = ${userId}::uuid AND id = ANY(${categoryIds}::uuid[]) AND deleted_at IS NULL
        ORDER BY id FOR SHARE`
    : [];
  return {
    now: new Date(),
    wallets: wallets.map((w) => ({ id: w.id, archived: w.archived_at !== null })),
    categories: categories.map((c) => ({ id: c.id, type: c.type, archived: c.archived_at !== null })),
  };
}

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** Records a Transaksi from the web; the server makes its ID, a Perangkat makes its own (ADR 0005). */
export async function createTransaction(userId: string, draft: TransactionDraft): Promise<TransactionView> {
  return db.$transaction(async (tx) => {
    const result = validateNewTransaction(draft, await ruleContext(tx, userId, draft));
    if (!result.ok) throw ServiceError.fromDomain(result.error);
    const v = result.value;
    const row = await tx.transaction.create({
      data: {
        userId,
        type: v.type,
        amount: BigInt(v.amount),
        walletId: v.walletId,
        toWalletId: v.toWalletId,
        categoryId: v.categoryId,
        description: v.description,
        occurredAt: v.occurredAt,
      },
      include: withNames,
    });
    return toView(row);
  });
}

async function findLive(client: Tx | typeof db, userId: string, id: string) {
  const row = isUuid(id)
    ? await client.transaction.findFirst({ where: { id, userId, deletedAt: null }, include: withNames })
    : null;
  if (!row) throw ServiceError.notFound("Transaction");
  return row;
}

export async function getTransaction(userId: string, id: string): Promise<TransactionView> {
  return toView(await findLive(db, userId, id));
}

const draftOf = (row: Row): TransactionDraft => ({
  type: row.type,
  amount: Number(row.amount),
  walletId: row.walletId,
  toWalletId: row.toWalletId,
  categoryId: row.categoryId,
  description: row.description,
  occurredAt: row.occurredAt,
});

export async function updateTransaction(userId: string, id: string, patch: TransactionPatch): Promise<TransactionView> {
  return db.$transaction(async (tx) => {
    const current = draftOf(await findLive(tx, userId, id));
    const result = validateTransactionEdit(current, patch, await ruleContext(tx, userId, current, patch));
    if (!result.ok) throw ServiceError.fromDomain(result.error);
    const v = result.value;
    const row = await tx.transaction.update({
      where: { id },
      data: {
        type: v.type,
        amount: BigInt(v.amount),
        walletId: v.walletId,
        toWalletId: v.toWalletId,
        categoryId: v.categoryId,
        description: v.description,
        occurredAt: v.occurredAt,
        clientUpdatedAt: new Date(),
      },
      include: withNames,
    });
    return toView(row);
  });
}

/** Marks the Transaksi deleted, for good: no later edit brings it back (ADR 0005). */
export async function deleteTransaction(userId: string, id: string): Promise<void> {
  const { count } = isUuid(id)
    ? await db.transaction.updateMany({ where: { id, userId, deletedAt: null }, data: { deletedAt: new Date(), clientUpdatedAt: new Date() } })
    : { count: 0 };
  if (count === 0) throw ServiceError.notFound("Transaction");
}

export type TransactionSort = "newest" | "oldest" | "amount_desc" | "amount_asc";

export type TransactionFilters = {
  search?: string;
  type?: TransactionType;
  categoryId?: string;
  /** Matches a transfer from or to this Dompet as well. */
  walletId?: string;
  /** Local dates (YYYY-MM-DD) in the profile timezone, both inclusive. */
  from?: string;
  to?: string;
  sort?: TransactionSort;
  page?: number;
  pageSize?: number;
};

const ORDER: Record<TransactionSort, Prisma.TransactionOrderByWithRelationInput[]> = {
  newest: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  oldest: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  amount_desc: [{ amount: "desc" }, { occurredAt: "desc" }],
  amount_asc: [{ amount: "asc" }, { occurredAt: "desc" }],
};

export const MAX_PAGE_SIZE = 100;

export async function listTransactions(
  userId: string,
  filters: TransactionFilters,
): Promise<{ items: TransactionView[]; total: number; page: number; pageSize: number; summary: { income: number; expense: number } }> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  if (!user) throw ServiceError.notFound("User");

  const where: Prisma.TransactionWhereInput = { userId, deletedAt: null };
  const and: Prisma.TransactionWhereInput[] = [];
  const search = filters.search?.trim();
  if (search) where.description = { contains: search, mode: "insensitive" };
  if (filters.type) where.type = filters.type;
  if (filters.categoryId && isUuid(filters.categoryId)) where.categoryId = filters.categoryId;
  else if (filters.categoryId) return empty(filters);
  if (filters.walletId && isUuid(filters.walletId)) {
    and.push({ OR: [{ walletId: filters.walletId }, { toWalletId: filters.walletId }] });
  } else if (filters.walletId) return empty(filters);
  if (filters.from || filters.to) {
    const occurredAt: Prisma.DateTimeFilter = {};
    if (filters.from) occurredAt.gte = localDayRange(filters.from, filters.from, user.timezone).start;
    if (filters.to) occurredAt.lt = localDayRange(filters.to, filters.to, user.timezone).endExclusive;
    if (Object.values(occurredAt).some((d) => Number.isNaN((d as Date).getTime()))) {
      throw new ServiceError(400, "INVALID_DATE", "Dates must look like 2026-11-14.");
    }
    where.occurredAt = occurredAt;
  }
  if (and.length) where.AND = and;

  const pageSize = Math.min(Math.max(1, Math.trunc(filters.pageSize ?? 25)), MAX_PAGE_SIZE);
  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const [rows, total, sums] = await Promise.all([
    db.transaction.findMany({
      where,
      include: withNames,
      orderBy: ORDER[filters.sort ?? "newest"],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.transaction.count({ where }),
    db.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
  ]);
  const sumOf = (type: TransactionType) => Number(sums.find((s) => s.type === type)?._sum.amount ?? 0n);
  return {
    items: rows.map(toView),
    total,
    page,
    pageSize,
    summary: { income: sumOf("INCOME"), expense: sumOf("EXPENSE") },
  };
}

function empty(filters: TransactionFilters) {
  return { items: [], total: 0, page: filters.page ?? 1, pageSize: filters.pageSize ?? 25, summary: { income: 0, expense: 0 } };
}
