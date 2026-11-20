import { DEFAULT_LANG, isLang, type Lang } from "@/domain/i18n";
import { db } from "./db";
import { ServiceError } from "./errors";
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

/**
 * Records the Pengguna's Bahasa (ADR 0006). A choice made earlier, by the Perangkat clock, than
 * the one already stored is dropped, so a phone coming back online never undoes a newer choice.
 * Returns the Bahasa the Akun ends up with.
 */
export async function setLanguage(userId: string, language: Lang, changedAt: Date = new Date()): Promise<Lang> {
  const { count } = await db.user.updateMany({
    where: { id: userId, OR: [{ languageChangedAt: null }, { languageChangedAt: { lte: changedAt } }] },
    data: { language, languageChangedAt: changedAt },
  });
  if (count > 0) return language;
  const user = await db.user.findUnique({ where: { id: userId }, select: { language: true } });
  if (!user) throw ServiceError.notFound("user");
  return isLang(user.language) ? user.language : DEFAULT_LANG;
}
