import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/test/db";
import {
  archiveCategory,
  createCategory,
  deleteCategory,
  listCategories,
  unarchiveCategory,
  updateCategory,
} from "./categories";
import { createTransaction, deleteTransaction } from "./transactions";
import { createUser } from "./users";
import { listWallets } from "./wallets";

beforeEach(resetDatabase);

const newUser = () => createUser({ name: "Dina", email: "dina@example.com", timezone: "Asia/Jakarta" });
const byName = async (userId: string, name: string) => (await listCategories(userId)).find((c) => c.name === name)!;

async function spend(userId: string, categoryId: string) {
  const [tunai] = (await listWallets(userId)).wallets;
  const transaction = await createTransaction(userId, {
    type: "EXPENSE", amount: 24_000, walletId: tunai!.id, toWalletId: null,
    categoryId, description: null, occurredAt: new Date(),
  });
  return transaction;
}

describe("a new Akun's Kategori", () => {
  it("are the Indonesian defaults in PRD order, all deletable", async () => {
    const user = await newUser();
    const categories = await listCategories(user.id);
    expect(categories.filter((c) => c.type === "INCOME").map((c) => c.name)).toEqual([
      "Gaji", "Uang Saku", "Freelance", "Bisnis", "Investasi", "Hadiah", "Pemasukan Lain",
    ]);
    expect(categories.every((c) => c.deletable && !c.archived)).toBe(true);
  });

  it("keep their place after a default is renamed", async () => {
    const user = await newUser();
    const gaji = await byName(user.id, "Gaji");
    await updateCategory(user.id, gaji.id, { name: "Zakat Penghasilan" });
    expect((await listCategories(user.id))[0]?.name).toBe("Zakat Penghasilan");
  });
});

describe("creating and editing a Kategori", () => {
  it("adds a custom expense category after the defaults", async () => {
    const user = await newUser();
    await createCategory(user.id, { type: "EXPENSE", name: "Kopi", icon: "coffee", color: "brown" });
    const expenses = (await listCategories(user.id)).filter((c) => c.type === "EXPENSE");
    expect(expenses.at(-1)?.name).toBe("Kopi");
  });

  it("refuses a name an archived category of the same type already has, whatever the case", async () => {
    const user = await newUser();
    const kopi = await createCategory(user.id, { type: "EXPENSE", name: "Kopi", icon: "coffee", color: "brown" });
    await archiveCategory(user.id, kopi.id);
    await expect(createCategory(user.id, { type: "EXPENSE", name: "kopi", icon: "coffee", color: "brown" })).rejects.toMatchObject({
      status: 422,
      code: "CATEGORY_NAME_TAKEN",
    });
    await expect(createCategory(user.id, { type: "INCOME", name: "Kopi", icon: "coffee", color: "brown" })).resolves.toBeTruthy();
  });

  it("lets an archived category be renamed, and the new name shows on its old transactions", async () => {
    const user = await newUser();
    const hiburan = await byName(user.id, "Hiburan");
    const transaction = await spend(user.id, hiburan.id);
    await archiveCategory(user.id, hiburan.id);
    await updateCategory(user.id, hiburan.id, { name: "Nonton", color: "violet" });
    const renamed = await byName(user.id, "Nonton");
    expect(renamed.archived).toBe(true);
    expect(transaction.categoryId).toBe(hiburan.id);
  });
});

describe("archiving a Kategori", () => {
  it("refuses the last active category of a type, and allows it once another is unarchived", async () => {
    const user = await newUser();
    const incomes = (await listCategories(user.id)).filter((c) => c.type === "INCOME");
    for (const c of incomes.slice(1)) await archiveCategory(user.id, c.id);
    await expect(archiveCategory(user.id, incomes[0]!.id)).rejects.toMatchObject({ code: "LAST_ACTIVE_CATEGORY" });

    await unarchiveCategory(user.id, incomes[1]!.id);
    await archiveCategory(user.id, incomes[0]!.id);
    expect((await byName(user.id, incomes[0]!.name)).archived).toBe(true);
  });

  it("keeps it off new transactions", async () => {
    const user = await newUser();
    const makanan = await byName(user.id, "Makanan");
    await archiveCategory(user.id, makanan.id);
    await expect(spend(user.id, makanan.id)).rejects.toMatchObject({ field: "categoryId" });
  });
});

describe("deleting a Kategori", () => {
  it("removes one that was never used", async () => {
    const user = await newUser();
    const hadiah = await byName(user.id, "Hadiah");
    await deleteCategory(user.id, hadiah.id);
    expect(await byName(user.id, "Hadiah")).toBeUndefined();
  });

  it("refuses one a transaction uses", async () => {
    const user = await newUser();
    const belanja = await byName(user.id, "Belanja");
    await spend(user.id, belanja.id);
    expect((await byName(user.id, "Belanja")).deletable).toBe(false);
    await expect(deleteCategory(user.id, belanja.id)).rejects.toMatchObject({ code: "CATEGORY_IN_USE" });
  });

  it("removes one used only by a deleted transaction (ADR 0005)", async () => {
    const user = await newUser();
    const belanja = await byName(user.id, "Belanja");
    const transaction = await spend(user.id, belanja.id);
    await deleteTransaction(user.id, transaction.id);
    expect((await byName(user.id, "Belanja")).deletable).toBe(true);
    await deleteCategory(user.id, belanja.id);
    expect(await byName(user.id, "Belanja")).toBeUndefined();
  });

  it("can't reach another Pengguna's category", async () => {
    const dina = await newUser();
    const budi = await createUser({ name: "Budi", email: "budi@example.com", timezone: "Asia/Jakarta" });
    const makanan = await byName(dina.id, "Makanan");
    await expect(deleteCategory(budi.id, makanan.id)).rejects.toMatchObject({ status: 404 });
    await expect(updateCategory(budi.id, makanan.id, { name: "Punya Budi" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("a Kategori's usage", () => {
  it("counts the Transaksi that use it and remembers the latest one", async () => {
    const user = await newUser();
    const makanan = await byName(user.id, "Makanan");
    await spend(user.id, makanan.id);
    const latest = await spend(user.id, makanan.id);
    const used = await byName(user.id, "Makanan");
    expect(used).toMatchObject({ transactionCount: 2, deletable: false });
    expect(used.lastUsedAt?.getTime()).toBe(new Date(latest.occurredAt).getTime());
  });

  it("is zero, with no last use, while nothing uses it", async () => {
    const user = await newUser();
    expect(await byName(user.id, "Belanja")).toMatchObject({ transactionCount: 0, lastUsedAt: null, deletable: true });
  });

  it("leaves out deleted Transaksi", async () => {
    const user = await newUser();
    const makanan = await byName(user.id, "Makanan");
    const t = await spend(user.id, makanan.id);
    await deleteTransaction(user.id, t.id);
    expect(await byName(user.id, "Makanan")).toMatchObject({ transactionCount: 0, lastUsedAt: null });
  });
});
