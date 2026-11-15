import { instantToLocal } from "@/domain/local-time";
import { listCategories } from "@/server/categories";
import { listWallets } from "@/server/wallets";
import type { FormCategory, FormWallet } from "./transaction-form";

/** What both the add and the edit screen need to render the form. */
export async function formData(userId: string, timezone: string) {
  const [{ wallets }, categories] = await Promise.all([listWallets(userId), listCategories(userId)]);
  return {
    timezone,
    now: instantToLocal(new Date(), timezone),
    wallets: wallets.map((w): FormWallet => ({ id: w.id, name: w.name, balance: w.balance, archived: w.archived })),
    categories: categories.map((c): FormCategory => ({ id: c.id, name: c.name, type: c.type, icon: c.icon, archived: c.archived })),
  };
}
