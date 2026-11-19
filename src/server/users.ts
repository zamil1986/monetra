import { db } from "./db";
import { DEFAULT_CATEGORIES } from "./default-categories";

/**
 * Gives a fresh Pengguna what every new Akun starts with (PRD 3.3 rule 1, 3.6):
 * a "Tunai" Dompet at Rp 0 and a private copy of the default Kategori.
 */
export async function provisionUser(userId: string) {
  // One millisecond apart and all in the past, so ordering by creation time keeps PRD order
  // even after a rename, and anything the Pengguna adds afterwards lands behind them.
  const now = Date.now();
  const n = DEFAULT_CATEGORIES.length;
  await db.$transaction([
    db.wallet.create({ data: { userId, name: "Tunai", openingBalance: 0n, icon: "cash", color: "olive" } }),
    db.category.createMany({
      data: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, userId, createdAt: new Date(now - n + i) })),
    }),
  ]);
}

/** A Pengguna without credentials, for tests and seed data. Real sign-ups go through Better Auth. */
export async function createUser(input: { name: string; email: string; timezone: string }) {
  const user = await db.user.create({ data: input });
  await provisionUser(user.id);
  return user;
}

export async function getUser(userId: string) {
  return db.user.findUnique({ where: { id: userId } });
}
