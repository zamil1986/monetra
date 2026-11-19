import {
  checkDelete,
  checkLeavesOneActive,
  validateCategoryInput,
  type CategoryInput,
} from "@/domain/category-rules";
import type { CategoryType } from "@/domain/types";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { ServiceError } from "./errors";

type Tx = Prisma.TransactionClient;

export type CategoryView = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  archived: boolean;
  /** No Transaksi uses it (PRD 3.6). */
  deletable: boolean;
};

/** Defaults first in PRD order, then the Pengguna's own by creation time (PRD 3.6). */
export async function listCategories(userId: string): Promise<CategoryView[]> {
  const [rows, used] = await Promise.all([
    db.category.findMany({ where: { userId, deletedAt: null }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    db.transaction.findMany({ where: { userId, deletedAt: null, categoryId: { not: null } }, distinct: ["categoryId"], select: { categoryId: true } }),
  ]);
  const everUsed = new Set(used.map((t) => t.categoryId));
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    archived: c.archivedAt !== null,
    deletable: !everUsed.has(c.id),
  }));
}

type LockedCategory = { id: string; name: string; type: CategoryType; archived_at: Date | null };

/**
 * Locks every Kategori of one type for the rest of the database transaction, so two archives
 * can't both pass the "last active one" check. Returns them all.
 */
async function lockType(tx: Tx, userId: string, type: CategoryType) {
  return tx.$queryRaw<LockedCategory[]>`
    SELECT id, name, type, archived_at FROM categories
    WHERE user_id = ${userId}::uuid AND type = ${type}::"CategoryType" AND deleted_at IS NULL
    ORDER BY id FOR UPDATE`;
}

/** Finds the Pengguna's Kategori and locks its whole type. */
async function lockOwned(tx: Tx, userId: string, id: string) {
  const found = await tx.category.findFirst({ where: { id, userId, deletedAt: null }, select: { type: true } });
  if (!found) throw ServiceError.notFound("Category");
  const siblings = await lockType(tx, userId, found.type);
  const self = siblings.find((c) => c.id === id);
  if (!self) throw ServiceError.notFound("Category");
  return { self, siblings };
}

const asExisting = (rows: LockedCategory[]) =>
  rows.map((c) => ({ id: c.id, name: c.name, type: c.type, archived: c.archived_at !== null }));

function validOrThrow(...args: Parameters<typeof validateCategoryInput>) {
  const result = validateCategoryInput(...args);
  if (!result.ok) throw ServiceError.fromDomain(result.error);
  return result.value;
}

export async function createCategory(userId: string, input: CategoryInput & { type: CategoryType }) {
  return db.$transaction(async (tx) => {
    const siblings = await lockType(tx, userId, input.type);
    const valid = validOrThrow(input, input.type, asExisting(siblings));
    return tx.category.create({ data: { ...valid, type: input.type, userId } });
  });
}

/** Name, icon and color may change, archived or not; the type never does (PRD 3.6). */
export async function updateCategory(userId: string, id: string, patch: Partial<CategoryInput>) {
  return db.$transaction(async (tx) => {
    const { self, siblings } = await lockOwned(tx, userId, id);
    const current = await tx.category.findUniqueOrThrow({ where: { id } });
    const valid = validOrThrow(
      { name: patch.name ?? current.name, icon: patch.icon ?? current.icon, color: patch.color ?? current.color },
      self.type,
      asExisting(siblings),
      id,
    );
    return tx.category.update({ where: { id }, data: { ...valid, clientUpdatedAt: new Date() } });
  });
}

function refuseIfLastActive(self: LockedCategory, siblings: LockedCategory[]) {
  const check = checkLeavesOneActive({
    type: self.type,
    archived: self.archived_at !== null,
    activeOfSameType: siblings.filter((c) => c.archived_at === null).length,
  });
  if (!check.ok) throw ServiceError.fromDomain(check.error);
}

export async function archiveCategory(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    const { self, siblings } = await lockOwned(tx, userId, id);
    if (self.archived_at) return;
    refuseIfLastActive(self, siblings);
    await tx.category.update({ where: { id }, data: { archivedAt: new Date(), clientUpdatedAt: new Date() } });
  });
}

/** Names are unique across archived Kategori too, so unarchiving never clashes (PRD 3.6). */
export async function unarchiveCategory(userId: string, id: string) {
  const found = await db.category.findFirst({ where: { id, userId, deletedAt: null } });
  if (!found) throw ServiceError.notFound("Category");
  await db.category.update({ where: { id }, data: { archivedAt: null, clientUpdatedAt: new Date() } });
}

export async function deleteCategory(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    const { self, siblings } = await lockOwned(tx, userId, id);
    const check = checkDelete({ transactionCount: await tx.transaction.count({ where: { categoryId: id, deletedAt: null } }) });
    if (!check.ok) throw ServiceError.fromDomain(check.error);
    refuseIfLastActive(self, siblings);
    // A mark, not a removal, so other Perangkat learn of it (ADR 0005).
    await tx.category.update({ where: { id }, data: { deletedAt: new Date(), clientUpdatedAt: new Date() } });
  });
}
