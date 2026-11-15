import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/test/db";
import { createUser } from "./users";
import { archiveWallet, createWallet, deleteWallet, listWallets, unarchiveWallet, updateWallet } from "./wallets";
import { createTransaction } from "./transactions";
import { listCategories } from "./categories";
import { randomUUID } from "node:crypto";

beforeEach(resetDatabase);

const newUser = (email = "dina@example.com") => createUser({ name: "Dina", email, timezone: "Asia/Jakarta" });

describe("a new Akun", () => {
  it("starts with one Tunai wallet at Rp 0 and the default categories", async () => {
    const user = await newUser();
    const { wallets, totalBalance } = await listWallets(user.id);
    expect(wallets.map((w) => [w.name, w.balance])).toEqual([["Tunai", 0]]);
    expect(totalBalance).toBe(0);

    const categories = await listCategories(user.id);
    expect(categories.filter((c) => c.type === "INCOME")).toHaveLength(7);
    expect(categories.filter((c) => c.type === "EXPENSE").map((c) => c.name)).toContain("Biaya Admin");
  });
});

describe("wallets", () => {
  it("adds a BCA wallet of Rp 2.000.000 straight onto the Total Balance (PRD 3.3)", async () => {
    const user = await newUser();
    await createWallet(user.id, { name: "BCA", openingBalance: 2_000_000, color: "blue", icon: "bank" });
    const { totalBalance } = await listWallets(user.id);
    expect(totalBalance).toBe(2_000_000);
  });

  it("moves the Saldo when the opening balance is edited", async () => {
    const user = await newUser();
    const bca = await createWallet(user.id, { name: "BCA", openingBalance: 2_000_000, color: "blue", icon: "bank" });
    await updateWallet(user.id, bca.id, { openingBalance: 2_500_000 });
    const { wallets } = await listWallets(user.id);
    expect(wallets.find((w) => w.id === bca.id)?.balance).toBe(2_500_000);
  });

  it("refuses to archive a wallet still holding Rp 50.000, and archives it at Rp 0", async () => {
    const user = await newUser();
    const gopay = await createWallet(user.id, { name: "GoPay", openingBalance: 50_000, color: "teal", icon: "ewallet" });
    await expect(archiveWallet(user.id, gopay.id)).rejects.toMatchObject({ status: 422, code: "WALLET_NOT_EMPTY" });

    const [food] = (await listCategories(user.id)).filter((c) => c.name === "Food");
    await createTransaction(user.id, {
      id: randomUUID(), type: "EXPENSE", amount: 50_000, walletId: gopay.id, toWalletId: null,
      categoryId: food!.id, description: null, occurredAt: new Date(),
    });
    await archiveWallet(user.id, gopay.id);

    const { wallets, totalBalance } = await listWallets(user.id);
    expect(wallets.find((w) => w.id === gopay.id)?.archived).toBe(true);
    expect(totalBalance).toBe(0);

    await unarchiveWallet(user.id, gopay.id);
    expect((await listWallets(user.id)).wallets.find((w) => w.id === gopay.id)?.archived).toBe(false);
  });

  it("can't be edited while archived, so an archived wallet never holds money", async () => {
    const user = await newUser();
    const old = await createWallet(user.id, { name: "Mandiri", openingBalance: 0, color: "slate", icon: "bank" });
    await archiveWallet(user.id, old.id);
    await expect(updateWallet(user.id, old.id, { openingBalance: 500_000 })).rejects.toMatchObject({ status: 422, code: "WALLET_ARCHIVED" });

    await unarchiveWallet(user.id, old.id);
    await updateWallet(user.id, old.id, { name: "Mandiri Payroll" });
    expect((await listWallets(user.id)).wallets.find((w) => w.id === old.id)?.name).toBe("Mandiri Payroll");
  });

  it("deletes a wallet never used, but not one with a transaction", async () => {
    const user = await newUser();
    const unused = await createWallet(user.id, { name: "Spare", openingBalance: 0, color: "slate", icon: "cash" });
    await deleteWallet(user.id, unused.id);
    expect((await listWallets(user.id)).wallets.map((w) => w.name)).toEqual(["Tunai"]);

    const [tunai] = (await listWallets(user.id)).wallets;
    const [salary] = (await listCategories(user.id)).filter((c) => c.name === "Salary");
    await createTransaction(user.id, {
      id: randomUUID(), type: "INCOME", amount: 10_000, walletId: tunai!.id, toWalletId: null,
      categoryId: salary!.id, description: null, occurredAt: new Date(),
    });
    await expect(deleteWallet(user.id, tunai!.id)).rejects.toMatchObject({ status: 422, code: "WALLET_IN_USE" });
  });

  it("are invisible to another Pengguna", async () => {
    const dina = await newUser();
    const other = await newUser("other@example.com");
    const bca = await createWallet(dina.id, { name: "BCA", openingBalance: 2_000_000, color: "blue", icon: "bank" });

    await expect(updateWallet(other.id, bca.id, { name: "Mine now" })).rejects.toMatchObject({ status: 404 });
    await expect(archiveWallet(other.id, bca.id)).rejects.toMatchObject({ status: 404 });
    await expect(deleteWallet(other.id, bca.id)).rejects.toMatchObject({ status: 404 });
    expect((await listWallets(other.id)).wallets.map((w) => w.name)).toEqual(["Tunai"]);
  });
});
