import { balancesByWallet, totalBalance as sumActive } from "@/domain/balance";
import type { Movement } from "@/domain/types";
import {
  checkArchive,
  checkDelete,
  checkEdit,
  validateWalletInput,
  type WalletColor,
  type WalletIcon,
  type WalletInput,
} from "@/domain/wallet-rules";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { ServiceError } from "./errors";

type Tx = Prisma.TransactionClient;

export type WalletView = {
  id: string;
  name: string;
  openingBalance: number;
  balance: number;
  color: WalletColor;
  icon: WalletIcon;
  archived: boolean;
  archivedAt: Date | null;
  /** Live Transaksi on this Dompet, as either side. */
  transactionCount: number;
  /** Never used, not even by a deleted Transaksi (PRD 3.3 rule 6, ADR 0003). */
  deletable: boolean;
};

/** Live (not deleted) Transaksi touching these wallets, summed per type and direction. */
async function movementsFor(client: Tx | typeof db, userId: string, walletIds?: string[]): Promise<Movement[]> {
  const touching = walletIds ? { OR: [{ walletId: { in: walletIds } }, { toWalletId: { in: walletIds } }] } : {};
  const groups = await client.transaction.groupBy({
    by: ["type", "walletId", "toWalletId"],
    where: { userId, deletedAt: null, ...touching },
    _sum: { amount: true },
  });
  return groups.map((g) => ({
    type: g.type,
    walletId: g.walletId,
    toWalletId: g.toWalletId,
    amount: Number(g._sum.amount ?? 0n),
  }));
}

/** Every Dompet of the Pengguna with its Saldo, plus the Total Balance of the active ones. */
export async function listWallets(userId: string): Promise<{ wallets: WalletView[]; totalBalance: number }> {
  const [rows, movements, usedFrom, usedTo, everFrom, everTo] = await Promise.all([
    db.wallet.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    movementsFor(db, userId),
    db.transaction.groupBy({ by: ["walletId"], where: { userId, deletedAt: null }, _count: true }),
    db.transaction.groupBy({ by: ["toWalletId"], where: { userId, deletedAt: null, toWalletId: { not: null } }, _count: true }),
    db.transaction.findMany({ where: { userId }, distinct: ["walletId"], select: { walletId: true } }),
    db.transaction.findMany({ where: { userId, toWalletId: { not: null } }, distinct: ["toWalletId"], select: { toWalletId: true } }),
  ]);
  const everUsed = new Set([...everFrom.map((t) => t.walletId), ...everTo.map((t) => t.toWalletId)]);
  const states = rows.map((w) => ({ id: w.id, openingBalance: Number(w.openingBalance), archived: w.archivedAt !== null }));
  const balances = balancesByWallet(states, movements);
  const counts = new Map<string, number>();
  for (const g of usedFrom) counts.set(g.walletId, (counts.get(g.walletId) ?? 0) + g._count);
  for (const g of usedTo) if (g.toWalletId) counts.set(g.toWalletId, (counts.get(g.toWalletId) ?? 0) + g._count);

  const wallets = rows.map((w) => ({
    id: w.id,
    name: w.name,
    openingBalance: Number(w.openingBalance),
    balance: balances.get(w.id) ?? 0,
    color: w.color as WalletColor,
    icon: w.icon as WalletIcon,
    archived: w.archivedAt !== null,
    archivedAt: w.archivedAt,
    transactionCount: counts.get(w.id) ?? 0,
    deletable: !everUsed.has(w.id),
  }));
  return { wallets, totalBalance: sumActive(states, movements) };
}

/**
 * Locks the Pengguna's wallets for the rest of the database transaction, so archiving and
 * recording a Transaksi on the same Dompet can't interleave. Returns the rows that exist.
 */
export async function lockWallets(tx: Tx, userId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return tx.$queryRaw<{ id: string; name: string; opening_balance: bigint; archived_at: Date | null }[]>`
    SELECT id, name, opening_balance, archived_at FROM wallets
    WHERE user_id = ${userId}::uuid AND id = ANY(${ids}::uuid[])
    ORDER BY id FOR UPDATE`;
}

async function findOwned(client: Tx | typeof db, userId: string, id: string) {
  const wallet = await client.wallet.findFirst({ where: { id, userId } });
  if (!wallet) throw ServiceError.notFound("Wallet");
  return wallet;
}

function validOrThrow(input: WalletInput) {
  const result = validateWalletInput(input);
  if (!result.ok) throw ServiceError.fromDomain(result.error);
  return result.value;
}

export async function createWallet(userId: string, input: WalletInput) {
  const valid = validOrThrow(input);
  return db.wallet.create({ data: { ...valid, openingBalance: BigInt(valid.openingBalance), userId } });
}

export async function updateWallet(userId: string, id: string, patch: Partial<WalletInput>) {
  return db.$transaction(async (tx) => {
    // Locked so an archive can't land between this check and the update.
    const [locked] = await lockWallets(tx, userId, [id]);
    if (!locked) throw ServiceError.notFound("Wallet");
    const editable = checkEdit({ name: locked.name, archived: locked.archived_at !== null });
    if (!editable.ok) throw ServiceError.fromDomain(editable.error);
    const current = await findOwned(tx, userId, id);
    const valid = validOrThrow({
      name: patch.name ?? current.name,
      openingBalance: patch.openingBalance ?? Number(current.openingBalance),
      color: patch.color ?? current.color,
      icon: patch.icon ?? current.icon,
    });
    return tx.wallet.update({ where: { id }, data: { ...valid, openingBalance: BigInt(valid.openingBalance) } });
  });
}

export async function archiveWallet(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    const [locked] = await lockWallets(tx, userId, [id]);
    if (!locked) throw ServiceError.notFound("Wallet");
    if (locked.archived_at) return;
    const state = { id, openingBalance: Number(locked.opening_balance), archived: false };
    const balance = balancesByWallet([state], await movementsFor(tx, userId, [id])).get(id) ?? 0;
    const check = checkArchive({ name: locked.name, balance });
    if (!check.ok) throw ServiceError.fromDomain(check.error);
    await tx.wallet.update({ where: { id }, data: { archivedAt: new Date() } });
  });
}

export async function unarchiveWallet(userId: string, id: string) {
  await findOwned(db, userId, id);
  await db.wallet.update({ where: { id }, data: { archivedAt: null } });
}

export async function deleteWallet(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    const [locked] = await lockWallets(tx, userId, [id]);
    if (!locked) throw ServiceError.notFound("Wallet");
    // Deleted Transaksi still reference the Dompet (ADR 0003), so they count as use too.
    const transactionCount = await tx.transaction.count({ where: { OR: [{ walletId: id }, { toWalletId: id }] } });
    const check = checkDelete({ transactionCount });
    if (!check.ok) throw ServiceError.fromDomain(check.error);
    await tx.wallet.delete({ where: { id } });
  });
}
