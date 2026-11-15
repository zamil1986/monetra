import { db } from "./db";
import { DEFAULT_CATEGORIES } from "./default-categories";

/**
 * Creates a Pengguna with what every new Akun starts with (PRD 3.3 rule 1, 3.6):
 * a "Tunai" Dompet at Rp 0 and a private copy of the default Kategori.
 */
export async function createUser(input: { name: string; email: string; timezone: string }) {
  return db.user.create({
    data: {
      ...input,
      wallets: { create: { name: "Tunai", openingBalance: 0n, icon: "cash", color: "olive" } },
      categories: { create: DEFAULT_CATEGORIES },
    },
  });
}

export async function getUser(userId: string) {
  return db.user.findUnique({ where: { id: userId } });
}
