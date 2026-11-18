import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type { TransactionDraft } from "@/domain/transaction-rules";
import { resetDatabase } from "@/test/db";
import { listCategories } from "./categories";
import { getDashboard } from "./dashboard";
import { createTransaction, deleteTransaction } from "./transactions";
import { createUser } from "./users";
import { archiveWallet, createWallet } from "./wallets";

beforeEach(resetDatabase);

// Saturday 14 November 2026, 12:00 in Jakarta.
const now = new Date("2026-11-14T05:00:00Z");

async function setup() {
  const user = await createUser({ name: "Dina", email: "dina@example.com", timezone: "Asia/Jakarta" });
  const bca = await createWallet(user.id, { name: "BCA", openingBalance: 2_000_000, color: "blue", icon: "bank" });
  const gopay = await createWallet(user.id, { name: "GoPay", openingBalance: 50_000, color: "teal", icon: "ewallet" });
  const categories = await listCategories(user.id);
  const cat = (name: string) => categories.find((c) => c.name === name)!.id;
  const record = (draft: Partial<TransactionDraft>) =>
    createTransaction(user.id, {
      id: randomUUID(),
      type: "EXPENSE",
      amount: 10_000,
      walletId: bca.id,
      toWalletId: null,
      categoryId: cat("Food"),
      description: null,
      occurredAt: new Date("2026-11-10T05:00:00Z"),
      ...draft,
    }).then((r) => r.transaction);
  return { user, bca, gopay, cat, record };
}

describe("dashboard totals (PRD 3.2)", () => {
  it("sums Income and Expense in the period and leaves Transfer out of every total", async () => {
    const { user, gopay, cat, record } = await setup();
    await record({ type: "INCOME", amount: 1_000_000, categoryId: cat("Freelance") });
    await record({ amount: 260_000 });
    await record({ type: "TRANSFER", amount: 200_000, toWalletId: gopay.id, categoryId: null });

    const d = await getDashboard(user.id, { kind: "month" }, now);
    expect(d.income).toBe(1_000_000);
    expect(d.expense).toBe(260_000);
    expect(d.netCashFlow).toBe(740_000);
    expect(d.totalBalance).toBe(2_790_000);
  });

  it("draws period boundaries in the profile timezone, and the period never moves the balances", async () => {
    const { user, record } = await setup();
    // 00:30 on Sunday 1 November in Jakarta, though still 31 October in UTC.
    await record({ amount: 15_000, occurredAt: new Date("2026-10-31T17:30:00Z") });
    // 23:30 on Saturday 31 October in Jakarta.
    await record({ amount: 40_000, occurredAt: new Date("2026-10-31T16:30:00Z") });
    // Monday 9 November, start of this week.
    await record({ amount: 5_000, occurredAt: new Date("2026-11-08T17:00:00Z") });

    const month = await getDashboard(user.id, { kind: "month" }, now);
    const week = await getDashboard(user.id, { kind: "week" }, now);
    const october = await getDashboard(user.id, { kind: "custom", from: "2026-10-01", to: "2026-10-31" }, now);
    expect(month.expense).toBe(20_000);
    expect(week.expense).toBe(5_000);
    expect(week.period).toEqual({ kind: "week", from: "2026-11-09", to: "2026-11-15" });
    expect(october.expense).toBe(40_000);
    for (const d of [month, week, october]) {
      expect(d.totalBalance).toBe(1_990_000);
      expect(d.wallets.map((w) => [w.name, w.balance])).toEqual([["Tunai", 0], ["BCA", 1_940_000], ["GoPay", 50_000]]);
    }
  });

  it("ignores deleted transactions", async () => {
    const { user, record } = await setup();
    const t = await record({ amount: 99_000 });
    await deleteTransaction(user.id, t.id);

    const d = await getDashboard(user.id, { kind: "month" }, now);
    expect(d.expense).toBe(0);
    expect(d.totalBalance).toBe(2_050_000);
    expect(d.recent).toEqual([]);
    expect(d.hasTransactions).toBe(false);
  });

  it("refuses a custom period that ends before it starts", async () => {
    const { user } = await setup();
    await expect(getDashboard(user.id, { kind: "custom", from: "2026-11-10", to: "2026-11-01" }, now)).rejects.toMatchObject({
      status: 422,
      code: "INVALID_PERIOD",
    });
  });
});

describe("dashboard lists", () => {
  it("shows the five latest transactions of any period, newest first", async () => {
    const { user, record } = await setup();
    for (let day = 1; day <= 7; day++) {
      await record({ description: `Day ${day}`, occurredAt: new Date(`2026-10-0${day}T05:00:00Z`) });
    }

    const d = await getDashboard(user.id, { kind: "today" }, now);
    expect(d.expense).toBe(0);
    expect(d.hasTransactions).toBe(true);
    expect(d.recent.map((t) => t.title)).toEqual(["Day 7", "Day 6", "Day 5", "Day 4", "Day 3"]);
  });

  it("lists only active wallets, with negative balances as they are", async () => {
    const { user, gopay, record } = await setup();
    const old = await createWallet(user.id, { name: "Old OVO", openingBalance: 0, color: "violet", icon: "ewallet" });
    await archiveWallet(user.id, old.id);
    await record({ walletId: gopay.id, amount: 65_000 });

    const d = await getDashboard(user.id, { kind: "month" }, now);
    expect(d.wallets.map((w) => w.name)).toEqual(["Tunai", "BCA", "GoPay"]);
    expect(d.wallets.find((w) => w.name === "GoPay")!.balance).toBe(-15_000);
    expect(d.totalBalance).toBe(1_985_000);
  });
});
