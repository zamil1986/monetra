import { describe, expect, it } from "vitest";
import { validateNewTransaction, validateTransactionEdit, type TransactionDraft } from "./transaction-rules";

const NOW = new Date("2026-11-14T08:42:00Z");
const ctx = {
  now: NOW,
  wallets: [
    { id: "cash", archived: false },
    { id: "bca", archived: false },
    { id: "gopay", archived: false },
    { id: "mandiri", archived: true },
  ],
  categories: [
    { id: "food", type: "EXPENSE" as const, archived: false },
    { id: "admin-fee", type: "EXPENSE" as const, archived: false },
    { id: "salary", type: "INCOME" as const, archived: false },
    { id: "old-hobby", type: "EXPENSE" as const, archived: true },
  ],
};

const expense: TransactionDraft = {
  type: "EXPENSE",
  amount: 18_000,
  walletId: "cash",
  toWalletId: null,
  categoryId: "food",
  description: "Iced coffee",
  occurredAt: new Date("2026-11-14T08:40:00Z"),
};
const transfer: TransactionDraft = {
  type: "TRANSFER",
  amount: 100_000,
  walletId: "bca",
  toWalletId: "gopay",
  categoryId: null,
  description: null,
  occurredAt: NOW,
};

const fieldOf = (result: ReturnType<typeof validateNewTransaction>) => (result.ok ? null : result.error.field);

describe("recording a new Transaksi", () => {
  it("accepts an expense with an expense category", () => {
    expect(validateNewTransaction(expense, ctx)).toEqual({ ok: true, value: expense });
  });

  it("accepts a transfer between two different wallets without a category", () => {
    expect(validateNewTransaction(transfer, ctx).ok).toBe(true);
  });

  it("trims the description and stores a blank one as none", () => {
    const result = validateNewTransaction({ ...expense, description: "   " }, ctx);
    expect(result.ok && result.value.description).toBeNull();
  });

  it.each([
    ["zero", 0],
    ["negative", -5_000],
    ["fractional", 1_000.5],
  ])("refuses a %s amount", (_label, amount) => {
    expect(fieldOf(validateNewTransaction({ ...expense, amount }, ctx))).toBe("amount");
  });

  it("refuses an income or expense without a category", () => {
    expect(fieldOf(validateNewTransaction({ ...expense, categoryId: null }, ctx))).toBe("categoryId");
  });

  it("refuses a category whose type differs from the transaction", () => {
    expect(fieldOf(validateNewTransaction({ ...expense, type: "INCOME" }, ctx))).toBe("categoryId");
  });

  it("refuses a transfer with a category", () => {
    expect(fieldOf(validateNewTransaction({ ...transfer, categoryId: "food" }, ctx))).toBe("categoryId");
  });

  it("refuses a transfer without a destination or to the same wallet", () => {
    expect(fieldOf(validateNewTransaction({ ...transfer, toWalletId: null }, ctx))).toBe("toWalletId");
    expect(fieldOf(validateNewTransaction({ ...transfer, toWalletId: "bca" }, ctx))).toBe("toWalletId");
  });

  it("refuses a destination on an income or expense", () => {
    expect(fieldOf(validateNewTransaction({ ...expense, toWalletId: "bca" }, ctx))).toBe("toWalletId");
  });

  it("refuses a time in the future", () => {
    const later = new Date(NOW.getTime() + 10 * 60_000);
    expect(fieldOf(validateNewTransaction({ ...expense, occurredAt: later }, ctx))).toBe("occurredAt");
  });

  it("refuses an archived wallet or category", () => {
    expect(fieldOf(validateNewTransaction({ ...expense, walletId: "mandiri" }, ctx))).toBe("walletId");
    expect(fieldOf(validateNewTransaction({ ...transfer, toWalletId: "mandiri" }, ctx))).toBe("toWalletId");
    expect(fieldOf(validateNewTransaction({ ...expense, categoryId: "old-hobby" }, ctx))).toBe("categoryId");
  });

  it("refuses a wallet or category the person does not own", () => {
    expect(fieldOf(validateNewTransaction({ ...expense, walletId: "someone-elses" }, ctx))).toBe("walletId");
    expect(fieldOf(validateNewTransaction({ ...expense, categoryId: "someone-elses" }, ctx))).toBe("categoryId");
  });

  it("refuses a description over 120 characters", () => {
    expect(fieldOf(validateNewTransaction({ ...expense, description: "x".repeat(121) }, ctx))).toBe("description");
  });
});

describe("editing a Transaksi", () => {
  it("lets an expense become income once an income category is chosen", () => {
    const result = validateTransactionEdit(expense, { type: "INCOME", categoryId: "salary" }, ctx);
    expect(result.ok && result.value).toMatchObject({ type: "INCOME", categoryId: "salary", amount: 18_000 });
  });

  it("asks for the category again when an expense becomes income", () => {
    const result = validateTransactionEdit(expense, { type: "INCOME" }, ctx);
    expect(result.ok ? null : result.error.field).toBe("categoryId");
  });

  it("never turns a transfer into another type, or another type into a transfer", () => {
    const fromTransfer = validateTransactionEdit(transfer, { type: "EXPENSE", categoryId: "food", toWalletId: null }, ctx);
    const toTransfer = validateTransactionEdit(expense, { type: "TRANSFER", categoryId: null, toWalletId: "bca" }, ctx);
    expect(fromTransfer.ok ? null : fromTransfer.error.code).toBe("TYPE_CHANGE_NOT_ALLOWED");
    expect(toTransfer.ok ? null : toTransfer.error.code).toBe("TYPE_CHANGE_NOT_ALLOWED");
  });

  it("keeps a wallet and category that were archived after the transaction was recorded", () => {
    const recorded = { ...expense, walletId: "mandiri", categoryId: "old-hobby" };
    expect(validateTransactionEdit(recorded, { amount: 20_000 }, ctx).ok).toBe(true);
  });

  it("lets a transfer swap direction while one of its wallets is archived", () => {
    const recorded = { ...transfer, walletId: "bca", toWalletId: "mandiri" };
    expect(validateTransactionEdit(recorded, { walletId: "mandiri", toWalletId: "bca" }, ctx).ok).toBe(true);
  });

  it("refuses moving the transaction onto a different archived wallet", () => {
    const result = validateTransactionEdit(expense, { walletId: "mandiri" }, ctx);
    expect(result.ok ? null : result.error.field).toBe("walletId");
  });
});
