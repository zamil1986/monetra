import { beforeEach, describe, expect, it } from "vitest";
import type { TransactionDraft } from "@/domain/transaction-rules";
import { resetDatabase } from "@/test/db";
import { listCategories } from "./categories";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from "./transactions";
import { createUser } from "./users";
import { createWallet, listWallets } from "./wallets";

beforeEach(resetDatabase);

async function setup(email = "dina@example.com") {
  const user = await createUser({ name: "Dina", email, timezone: "Asia/Jakarta" });
  const bca = await createWallet(user.id, { name: "BCA", openingBalance: 2_000_000, color: "blue", icon: "bank" });
  const gopay = await createWallet(user.id, { name: "GoPay", openingBalance: 50_000, color: "teal", icon: "ewallet" });
  const categories = await listCategories(user.id);
  const cat = (name: string) => categories.find((c) => c.name === name)!.id;
  const record = (draft: Partial<TransactionDraft>) =>
    createTransaction(user.id, {
      type: "EXPENSE",
      amount: 10_000,
      walletId: bca.id,
      toWalletId: null,
      categoryId: cat("Makanan"),
      description: null,
      occurredAt: new Date("2026-11-10T05:00:00Z"),
      ...draft,
    });
  return { user, bca, gopay, cat, record };
}

const balanceOf = async (userId: string, walletId: string) =>
  (await listWallets(userId)).wallets.find((w) => w.id === walletId)!.balance;

describe("recording a Transaksi", () => {
  it("records a GoPay top-up with its admin fee: only the fee leaves the Total Balance (PRD 3.4)", async () => {
    const { user, bca, gopay, cat, record } = await setup();
    await record({ type: "TRANSFER", amount: 100_000, toWalletId: gopay.id, categoryId: null });
    await record({ amount: 1_000, categoryId: cat("Biaya Admin") });

    const { totalBalance } = await listWallets(user.id);
    expect(totalBalance).toBe(2_049_000);
    expect(await balanceOf(user.id, bca.id)).toBe(1_899_000);
    expect(await balanceOf(user.id, gopay.id)).toBe(150_000);

    const { summary } = await listTransactions(user.id, {});
    expect(summary).toEqual({ income: 0, expense: 1_000 });
  });

  it("refuses a wallet belonging to someone else", async () => {
    const dina = await setup();
    const other = await setup("other@example.com");
    await expect(dina.record({ walletId: other.bca.id })).rejects.toMatchObject({ status: 422, field: "walletId" });
  });
});

describe("editing a Transaksi", () => {
  it("changes the Saldo of both the old and the new wallet", async () => {
    const { user, bca, gopay, record } = await setup();
    const transaction = await record({ amount: 20_000 });
    await updateTransaction(user.id, transaction.id, { walletId: gopay.id, amount: 30_000 });

    expect(await balanceOf(user.id, bca.id)).toBe(2_000_000);
    expect(await balanceOf(user.id, gopay.id)).toBe(20_000);
  });

  it("turns an expense into income with an income category", async () => {
    const { user, bca, cat, record } = await setup();
    const transaction = await record({ amount: 20_000 });
    const updated = await updateTransaction(user.id, transaction.id, { type: "INCOME", categoryId: cat("Gaji") });

    expect(updated.type).toBe("INCOME");
    expect(updated.categoryName).toBe("Gaji");
    expect(await balanceOf(user.id, bca.id)).toBe(2_020_000);
  });

  it("refuses to turn a transfer into an expense", async () => {
    const { user, gopay, cat, record } = await setup();
    const transaction = await record({ type: "TRANSFER", toWalletId: gopay.id, categoryId: null });
    await expect(
      updateTransaction(user.id, transaction.id, { type: "EXPENSE", toWalletId: null, categoryId: cat("Makanan") }),
    ).rejects.toMatchObject({ status: 422, code: "TYPE_CHANGE_NOT_ALLOWED" });
  });

  it("can't touch another Pengguna's Transaksi", async () => {
    const dina = await setup();
    const other = await setup("other@example.com");
    const transaction = await dina.record({});
    await expect(updateTransaction(other.user.id, transaction.id, { amount: 1 })).rejects.toMatchObject({ status: 404 });
    await expect(deleteTransaction(other.user.id, transaction.id)).rejects.toMatchObject({ status: 404 });
    await expect(getTransaction(other.user.id, transaction.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe("deleting a Transaksi", () => {
  it("removes it from every list and from the Saldo", async () => {
    const { user, bca, record } = await setup();
    const transaction = await record({ amount: 50_000 });
    await deleteTransaction(user.id, transaction.id);

    expect(await balanceOf(user.id, bca.id)).toBe(2_000_000);
    expect((await listTransactions(user.id, {})).total).toBe(0);
    await expect(getTransaction(user.id, transaction.id)).rejects.toMatchObject({ status: 404 });
  });

  it("lets the wallet be deleted once its only transaction is gone (ADR 0005)", async () => {
    const { user, gopay, cat, record } = await setup();
    const transaction = await record({ walletId: gopay.id, categoryId: cat("Makanan") });
    await deleteTransaction(user.id, transaction.id);
    const wallet = (await listWallets(user.id)).wallets.find((w) => w.id === gopay.id)!;
    expect(wallet.deletable).toBe(true);
  });

  it("answers a second delete of the same Transaksi with not found", async () => {
    const { user, record } = await setup();
    const transaction = await record({});
    await deleteTransaction(user.id, transaction.id);
    await expect(deleteTransaction(user.id, transaction.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe("transaction history", () => {
  async function history() {
    const ctx = await setup();
    const { record, cat, gopay } = ctx;
    await record({ description: "Weekly groceries", amount: 260_000, categoryId: cat("Belanja"), occurredAt: new Date("2026-11-14T03:15:00Z") });
    await record({ description: "Lunch at Warteg", amount: 24_000, occurredAt: new Date("2026-11-14T05:40:00Z") });
    await record({ type: "TRANSFER", amount: 200_000, toWalletId: gopay.id, categoryId: null, occurredAt: new Date("2026-11-13T12:02:00Z") });
    await record({ type: "INCOME", amount: 1_000_000, categoryId: cat("Freelance"), description: "Logo project", occurredAt: new Date("2026-11-09T09:20:00Z") });
    // 23:30 on 31 Oct in Jakarta: outside a November range.
    await record({ description: "Late snack", amount: 15_000, occurredAt: new Date("2026-10-31T16:30:00Z") });
    return ctx;
  }

  it("lists newest first by default and titles a bare transfer by its destination", async () => {
    const { user } = await history();
    const { items, total } = await listTransactions(user.id, {});
    expect(total).toBe(5);
    expect(items.map((t) => t.title)).toEqual(["Lunch at Warteg", "Weekly groceries", "Transfer to GoPay", "Logo project", "Late snack"]);
  });

  it("finds a transaction by part of its description, ignoring case", async () => {
    const { user } = await history();
    const { items } = await listTransactions(user.id, { search: "warteg" });
    expect(items.map((t) => t.title)).toEqual(["Lunch at Warteg"]);
  });

  it("combines type, category and local-date filters", async () => {
    const { user, cat } = await history();
    const november = { from: "2026-11-01", to: "2026-11-14" };
    expect((await listTransactions(user.id, { ...november, type: "EXPENSE" })).total).toBe(2);
    expect((await listTransactions(user.id, { ...november, type: "EXPENSE", categoryId: cat("Makanan") })).total).toBe(1);
    expect((await listTransactions(user.id, { to: "2026-10-31" })).items.map((t) => t.title)).toEqual(["Late snack"]);
  });

  it("matches a transfer when filtering by either of its wallets", async () => {
    const { user, gopay } = await history();
    const { items } = await listTransactions(user.id, { walletId: gopay.id });
    expect(items.map((t) => t.title)).toEqual(["Transfer to GoPay"]);
  });

  it("sorts by amount and pages through results", async () => {
    const { user } = await history();
    const highest = await listTransactions(user.id, { sort: "amount_desc", pageSize: 2 });
    expect(highest.items.map((t) => t.amount)).toEqual([1_000_000, 260_000]);
    const next = await listTransactions(user.id, { sort: "amount_desc", pageSize: 2, page: 2 });
    expect(next.items.map((t) => t.amount)).toEqual([200_000, 24_000]);
    const oldest = await listTransactions(user.id, { sort: "oldest", pageSize: 1 });
    expect(oldest.items[0]?.title).toBe("Late snack");
  });

  it("sums income and expense for the filtered set, leaving transfers out", async () => {
    const { user } = await history();
    const { summary } = await listTransactions(user.id, { from: "2026-11-01", to: "2026-11-14" });
    expect(summary).toEqual({ income: 1_000_000, expense: 284_000 });
  });

  it("only ever shows the Pengguna's own transactions", async () => {
    await history();
    const other = await setup("other@example.com");
    expect((await listTransactions(other.user.id, {})).total).toBe(0);
  });
});
