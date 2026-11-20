import { beforeEach, describe, expect, it } from "vitest";
import type { TransactionDraft } from "@/domain/transaction-rules";
import { resetDatabase } from "@/test/db";
import { getSpendingMonth } from "./calendar";
import { listCategories } from "./categories";
import { createTransaction, deleteTransaction } from "./transactions";
import { createUser } from "./users";
import { createWallet } from "./wallets";

beforeEach(resetDatabase);

async function setup() {
  const user = await createUser({ name: "Dina", email: "dina@example.com", timezone: "Asia/Jakarta" });
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
  return { user, gopay, cat, record };
}

describe("spending calendar", () => {
  it("totals each local day and leaves Transfer out of the spending", async () => {
    const { user, gopay, cat, record } = await setup();
    await record({ amount: 24_000 });
    await record({ amount: 1_250_000, occurredAt: new Date("2026-11-03T02:00:00Z") });
    await record({ type: "INCOME", amount: 7_500_000, categoryId: cat("Freelance") });
    await record({ type: "TRANSFER", amount: 200_000, toWalletId: gopay.id, categoryId: null });

    const m = await getSpendingMonth(user.id, "2026-11");
    expect(m.days["2026-11-10"]).toEqual({ expense: 24_000, income: 7_500_000, count: 3 });
    expect(m.spent).toBe(1_274_000);
    expect(m.biggest).toEqual({ date: "2026-11-03", expense: 1_250_000 });
  });

  it("draws the month and the days in the profile timezone and skips deleted transactions", async () => {
    const { user, record } = await setup();
    // 00:30 on 1 November in Jakarta is still 31 October in UTC.
    await record({ amount: 50_000, occurredAt: new Date("2026-10-31T17:30:00Z") });
    // 23:30 on 31 October in Jakarta.
    await record({ amount: 40_000, occurredAt: new Date("2026-10-31T16:30:00Z") });
    const gone = await record({ amount: 99_000 });
    await deleteTransaction(user.id, gone.id);

    const nov = await getSpendingMonth(user.id, "2026-11");
    expect(nov.days).toEqual({ "2026-11-01": { expense: 50_000, income: 0, count: 1 } });
    const oct = await getSpendingMonth(user.id, "2026-10");
    expect(oct.days).toEqual({ "2026-10-31": { expense: 40_000, income: 0, count: 1 } });
    const sep = await getSpendingMonth(user.id, "2026-09");
    expect(sep.biggest).toBeNull();
  });
});
