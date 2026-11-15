import { db } from "@/server/db";

/** Empties every domain table so each test starts from nothing. */
export async function resetDatabase() {
  await db.$executeRawUnsafe("TRUNCATE transactions, wallets, categories, users CASCADE");
}
