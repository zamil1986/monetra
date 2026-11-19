import { z } from "zod";
import { findNameClash, validateCategoryInput } from "@/domain/category-rules";
import type { DomainError } from "@/domain/errors";
import type { Result } from "@/domain/result";
import { validateNewTransaction, validateTransactionEdit, type TransactionDraft } from "@/domain/transaction-rules";
import type { CategoryType } from "@/domain/types";
import { validateWalletInput } from "@/domain/wallet-rules";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

/*
 * Sinkronisasi (ADR 0005). A Perangkat pushes the changes it queued, in the order it made them,
 * then pulls everything that changed since its cursor. Rules:
 * - IDs come from the Perangkat; sending the same change twice changes nothing.
 * - Last write wins per record, by the Perangkat's clock at the time of the edit.
 * - A delete is final: later edits of that record are ignored.
 * - A Dompet or Kategori that is deleted but still used by a Transaksi comes back archived.
 * - A Transaksi on an archived Dompet or Kategori is accepted: it happened.
 * - A Kategori named like an existing one of the same type is merged into it.
 */

type Tx = Prisma.TransactionClient;

const instant = z.iso.datetime({ offset: true }).transform((s) => new Date(s));
const base = { id: z.uuid(), clientUpdatedAt: instant };

const walletFields = z.object({
  name: z.string(),
  openingBalance: z.number().int(),
  color: z.string(),
  icon: z.string(),
  archivedAt: instant.nullable(),
});
const categoryFields = z.object({
  name: z.string(),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string(),
  icon: z.string(),
  archivedAt: instant.nullable(),
});
const transactionFields = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  amount: z.number().int(),
  walletId: z.uuid(),
  toWalletId: z.uuid().nullable(),
  categoryId: z.uuid().nullable(),
  description: z.string().nullable(),
  occurredAt: instant,
});

const mutationSchema = z.union([
  z.object({ ...base, entity: z.literal("wallet"), op: z.literal("upsert"), fields: walletFields }),
  z.object({ ...base, entity: z.literal("category"), op: z.literal("upsert"), fields: categoryFields }),
  z.object({ ...base, entity: z.literal("transaction"), op: z.literal("upsert"), fields: transactionFields }),
  z.object({ ...base, entity: z.enum(["wallet", "category", "transaction"]), op: z.literal("delete") }),
]);

export const MAX_PUSH = 500;
export const pushSchema = z.object({ mutations: z.array(mutationSchema).max(MAX_PUSH) });
export const pullQuerySchema = z.object({
  since: z.string().regex(/^\d+$/, "since must be a cursor from an earlier pull").default("0"),
});

export type Mutation = z.infer<typeof mutationSchema>;
export type Entity = Mutation["entity"];

export type MutationResult = {
  entity: Entity;
  id: string;
  /** applied: the change is now on the server. ignored: nothing to do (already there, older, or deleted). rejected: it breaks a rule. */
  status: "applied" | "ignored" | "rejected";
  code?: string;
  message?: string;
};

export type PushResult = {
  results: MutationResult[];
  /** Kategori IDs the Perangkat made that now stand for another Kategori. Rewrite them locally. */
  remap: Record<string, string>;
};

const applied = (m: Mutation, code?: string): MutationResult => ({ entity: m.entity, id: m.id, status: "applied", code });
const ignored = (m: Mutation, code: string): MutationResult => ({ entity: m.entity, id: m.id, status: "ignored", code });
const rejected = (m: Mutation, code: string, message: string): MutationResult => ({ entity: m.entity, id: m.id, status: "rejected", code, message });
const refusedBy = (m: Mutation, r: Result<unknown, DomainError> & { ok: false }) => rejected(m, r.error.code, r.error.message);

type Existing = { userId: string; deletedAt: Date | null; clientUpdatedAt: Date } | null;

/** The checks every upsert shares, or null when the change should go ahead. */
function gate(m: Mutation, userId: string, existing: Existing): MutationResult | null {
  if (existing && existing.userId !== userId) return rejected(m, "ID_TAKEN", "That ID belongs to another record.");
  if (existing?.deletedAt) return ignored(m, "DELETED");
  if (existing && existing.clientUpdatedAt.getTime() >= m.clientUpdatedAt.getTime()) return ignored(m, "STALE");
  return null;
}

/** Takes the Pengguna's sync lock for the rest of the database transaction (see the version trigger). */
async function lockUser(tx: Tx, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
}

async function resolveAlias(tx: Tx, userId: string, categoryId: string) {
  const alias = await tx.categoryAlias.findFirst({ where: { aliasId: categoryId, userId } });
  return alias?.targetId ?? categoryId;
}

const liveUseOfWallet = (tx: Tx, id: string) =>
  tx.transaction.count({ where: { deletedAt: null, OR: [{ walletId: id }, { toWalletId: id }] } });
const liveUseOfCategory = (tx: Tx, id: string) => tx.transaction.count({ where: { deletedAt: null, categoryId: id } });

async function upsertWallet(tx: Tx, userId: string, m: Mutation & { entity: "wallet"; op: "upsert" }) {
  const existing = await tx.wallet.findUnique({ where: { id: m.id } });
  const stop = gate(m, userId, existing);
  if (stop) return stop;
  const valid = validateWalletInput(m.fields);
  if (!valid.ok) return refusedBy(m, valid);
  const data = {
    ...valid.value,
    openingBalance: BigInt(valid.value.openingBalance),
    archivedAt: m.fields.archivedAt,
    clientUpdatedAt: m.clientUpdatedAt,
  };
  if (existing) await tx.wallet.update({ where: { id: m.id }, data });
  else await tx.wallet.create({ data: { ...data, id: m.id, userId } });
  return applied(m);
}

async function upsertCategory(tx: Tx, userId: string, m: Mutation & { entity: "category"; op: "upsert" }, remap: Record<string, string>) {
  const alias = await tx.categoryAlias.findFirst({ where: { aliasId: m.id, userId } });
  if (alias) {
    remap[m.id] = alias.targetId;
    return ignored(m, "MERGED");
  }
  const existing = await tx.category.findUnique({ where: { id: m.id } });
  const stop = gate(m, userId, existing);
  if (stop) return stop;
  const type: CategoryType = m.fields.type;
  if (existing && existing.type !== type) return rejected(m, "TYPE_CHANGE_NOT_ALLOWED", "A category never changes type.");
  const valid = validateCategoryInput(m.fields, type, [], m.id);
  if (!valid.ok) return refusedBy(m, valid);

  const siblings = await tx.category.findMany({ where: { userId, type, deletedAt: null }, select: { id: true, name: true, type: true, archivedAt: true } });
  const clash = findNameClash(valid.value.name, type, siblings.map((c) => ({ ...c, archived: c.archivedAt !== null })), m.id);
  if (clash) {
    // Kategori kembar: keep the one the server has, move this one's Transaksi onto it.
    if (existing) {
      await tx.transaction.updateMany({ where: { categoryId: m.id, userId }, data: { categoryId: clash.id } });
      await tx.category.update({ where: { id: m.id }, data: { deletedAt: new Date() } });
    }
    await tx.categoryAlias.upsert({
      where: { aliasId: m.id },
      create: { aliasId: m.id, userId, targetId: clash.id },
      update: { targetId: clash.id },
    });
    remap[m.id] = clash.id;
    return applied(m, "MERGED");
  }

  const data = { ...valid.value, archivedAt: m.fields.archivedAt, clientUpdatedAt: m.clientUpdatedAt };
  if (existing) await tx.category.update({ where: { id: m.id }, data });
  else await tx.category.create({ data: { ...data, type, id: m.id, userId } });
  return applied(m);
}

/** Brings back a deleted Dompet or Kategori a Transaksi still needs, as Arsip (ADR 0005). */
async function revive(tx: Tx, table: "wallet" | "category", row: { id: string; deletedAt: Date | null; archivedAt: Date | null }) {
  if (!row.deletedAt) return;
  const data = { deletedAt: null, archivedAt: row.archivedAt ?? new Date() };
  if (table === "wallet") await tx.wallet.update({ where: { id: row.id }, data });
  else await tx.category.update({ where: { id: row.id }, data });
}

async function upsertTransaction(tx: Tx, userId: string, m: Mutation & { entity: "transaction"; op: "upsert" }, remap: Record<string, string>) {
  const existing = await tx.transaction.findUnique({ where: { id: m.id } });
  const stop = gate(m, userId, existing);
  if (stop) return stop;

  const f = m.fields;
  let categoryId = f.categoryId;
  if (categoryId) {
    const target = await resolveAlias(tx, userId, categoryId);
    if (target !== categoryId) remap[categoryId] = target;
    categoryId = target;
  }

  const walletIds = [f.walletId, f.toWalletId].filter((id): id is string => !!id);
  const wallets = await tx.wallet.findMany({ where: { userId, id: { in: walletIds } } });
  const categories = categoryId ? await tx.category.findMany({ where: { userId, id: categoryId } }) : [];

  // Archived counts as usable here: the Transaksi already happened on the Perangkat.
  const draft: TransactionDraft = { ...f, categoryId };
  const ctx = {
    now: new Date(),
    wallets: wallets.map((w) => ({ id: w.id, archived: false })),
    categories: categories.map((c) => ({ id: c.id, type: c.type, archived: false })),
  };
  const current: TransactionDraft | null = existing && {
    type: existing.type,
    amount: Number(existing.amount),
    walletId: existing.walletId,
    toWalletId: existing.toWalletId,
    categoryId: existing.categoryId,
    description: existing.description,
    occurredAt: existing.occurredAt,
  };
  const valid = current ? validateTransactionEdit(current, draft, ctx) : validateNewTransaction(draft, ctx);
  if (!valid.ok) return refusedBy(m, valid);

  for (const w of wallets) await revive(tx, "wallet", w);
  for (const c of categories) await revive(tx, "category", c);

  const v = valid.value;
  const data = {
    type: v.type,
    amount: BigInt(v.amount),
    walletId: v.walletId,
    toWalletId: v.toWalletId,
    categoryId: v.categoryId,
    description: v.description,
    occurredAt: v.occurredAt,
    clientUpdatedAt: m.clientUpdatedAt,
  };
  if (existing) await tx.transaction.update({ where: { id: m.id }, data });
  else await tx.transaction.create({ data: { ...data, id: m.id, userId } });
  return applied(m);
}

async function remove(tx: Tx, userId: string, m: Mutation & { op: "delete" }, remap: Record<string, string>) {
  if (m.entity === "category") {
    const alias = await tx.categoryAlias.findFirst({ where: { aliasId: m.id, userId } });
    if (alias) {
      remap[m.id] = alias.targetId;
      return ignored(m, "MERGED");
    }
  }
  const find = { where: { id: m.id } };
  const existing =
    m.entity === "wallet" ? await tx.wallet.findUnique(find)
    : m.entity === "category" ? await tx.category.findUnique(find)
    : await tx.transaction.findUnique(find);
  if (!existing) return ignored(m, "UNKNOWN");
  if (existing.userId !== userId) return rejected(m, "ID_TAKEN", "That ID belongs to another record.");
  if (existing.deletedAt) return ignored(m, "DELETED");

  const tombstone = { deletedAt: new Date(), clientUpdatedAt: m.clientUpdatedAt };
  if (m.entity === "transaction") {
    await tx.transaction.update({ where: { id: m.id }, data: tombstone });
    return applied(m);
  }
  // Another Perangkat recorded a Transaksi on it meanwhile: keep it, as Arsip.
  const inUse = m.entity === "wallet" ? await liveUseOfWallet(tx, m.id) : await liveUseOfCategory(tx, m.id);
  const archivedAt = (existing as { archivedAt: Date | null }).archivedAt ?? new Date();
  const data = inUse ? { archivedAt, clientUpdatedAt: m.clientUpdatedAt } : tombstone;
  if (m.entity === "wallet") await tx.wallet.update({ where: { id: m.id }, data });
  else await tx.category.update({ where: { id: m.id }, data });
  return applied(m, inUse ? "ARCHIVED_INSTEAD" : undefined);
}

/** Applies a Perangkat's queued changes in order. Each stands alone: one refusal doesn't undo the rest. */
export async function push(userId: string, mutations: Mutation[]): Promise<PushResult> {
  const remap: Record<string, string> = {};
  const results: MutationResult[] = [];
  for (const m of mutations) {
    const result = await db.$transaction(async (tx) => {
      await lockUser(tx, userId);
      if (m.op === "delete") return remove(tx, userId, m, remap);
      if (m.entity === "wallet") return upsertWallet(tx, userId, m);
      if (m.entity === "category") return upsertCategory(tx, userId, m, remap);
      return upsertTransaction(tx, userId, m, remap);
    });
    results.push(result);
  }
  return { results, remap };
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

export type SyncedWallet = ReturnType<typeof walletOut>;
export type SyncedCategory = ReturnType<typeof categoryOut>;
export type SyncedTransaction = ReturnType<typeof transactionOut>;

const walletOut = (w: Prisma.WalletGetPayload<object>) => ({
  id: w.id, name: w.name, openingBalance: Number(w.openingBalance), color: w.color, icon: w.icon,
  archivedAt: iso(w.archivedAt), deletedAt: iso(w.deletedAt), clientUpdatedAt: w.clientUpdatedAt.toISOString(), createdAt: w.createdAt.toISOString(),
});
const categoryOut = (c: Prisma.CategoryGetPayload<object>) => ({
  id: c.id, name: c.name, type: c.type, color: c.color, icon: c.icon,
  archivedAt: iso(c.archivedAt), deletedAt: iso(c.deletedAt), clientUpdatedAt: c.clientUpdatedAt.toISOString(), createdAt: c.createdAt.toISOString(),
});
const transactionOut = (t: Prisma.TransactionGetPayload<object>) => ({
  id: t.id, type: t.type, amount: Number(t.amount), walletId: t.walletId, toWalletId: t.toWalletId, categoryId: t.categoryId,
  description: t.description, occurredAt: t.occurredAt.toISOString(),
  deletedAt: iso(t.deletedAt), clientUpdatedAt: t.clientUpdatedAt.toISOString(), createdAt: t.createdAt.toISOString(),
});

export const PULL_LIMIT = 500;

/**
 * Everything of the Pengguna that changed after `since`, deletions included, oldest first.
 * When `more` is true, pull again with the returned cursor.
 */
export async function pull(userId: string, since: bigint, limit = PULL_LIMIT) {
  return db.$transaction(async (tx) => {
    // Waits for any write of this Pengguna still in flight, so no lower version can appear later.
    await lockUser(tx, userId);
    const where = { userId, version: { gt: since } };
    const page = { orderBy: { version: "asc" as const }, take: limit };
    // One connection per database transaction: these run one after another.
    const wallets = await tx.wallet.findMany({ where, ...page });
    const categories = await tx.category.findMany({ where, ...page });
    const transactions = await tx.transaction.findMany({ where, ...page });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, timezone: true } });
    // A full page may have more behind it: stop the cursor at the lowest of the full pages' last versions.
    const full = [wallets, categories, transactions].filter((rows) => rows.length === limit);
    const all = [...wallets, ...categories, ...transactions];
    const cursor = full.length
      ? full.map((rows) => rows[rows.length - 1]!.version).reduce((a, b) => (a < b ? a : b))
      : all.reduce((max, r) => (r.version > max ? r.version : max), since);
    const upTo = <T extends { version: bigint }>(rows: T[]) => rows.filter((r) => r.version <= cursor);
    return {
      cursor: cursor.toString(),
      more: full.length > 0,
      profile: user,
      wallets: upTo(wallets).map(walletOut),
      categories: upTo(categories).map(categoryOut),
      transactions: upTo(transactions).map(transactionOut),
    };
  });
}
