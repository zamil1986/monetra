import { describe, expect, it } from "vitest";
import { balancesByWallet, totalBalance } from "./balance";

const BCA = { id: "bca", openingBalance: 2_000_000, archived: false };
const GOPAY = { id: "gopay", openingBalance: 50_000, archived: false };

describe("Saldo", () => {
  it("is the opening balance when a wallet has no transactions", () => {
    expect(balancesByWallet([BCA], []).get("bca")).toBe(2_000_000);
  });

  it("adds income, subtracts expense, and moves transfers between wallets", () => {
    const balances = balancesByWallet(
      [BCA, GOPAY],
      [
        { type: "INCOME", amount: 1_000_000, walletId: "bca", toWalletId: null },
        { type: "EXPENSE", amount: 260_000, walletId: "bca", toWalletId: null },
        { type: "TRANSFER", amount: 100_000, walletId: "bca", toWalletId: "gopay" },
        { type: "EXPENSE", amount: 32_000, walletId: "gopay", toWalletId: null },
      ],
    );
    expect(balances.get("bca")).toBe(2_640_000);
    expect(balances.get("gopay")).toBe(118_000);
  });

  it("may go below zero", () => {
    const balances = balancesByWallet(
      [{ id: "ovo", openingBalance: 0, archived: false }],
      [{ type: "EXPENSE", amount: 15_000, walletId: "ovo", toWalletId: null }],
    );
    expect(balances.get("ovo")).toBe(-15_000);
  });
});

describe("Total Balance", () => {
  it("drops by only the admin fee after a GoPay top-up from BCA (PRD 3.4)", () => {
    const transactions = [
      { type: "TRANSFER" as const, amount: 100_000, walletId: "bca", toWalletId: "gopay" },
      { type: "EXPENSE" as const, amount: 1_000, walletId: "bca", toWalletId: null },
    ];
    expect(totalBalance([BCA, GOPAY], [])).toBe(2_050_000);
    expect(totalBalance([BCA, GOPAY], transactions)).toBe(2_049_000);
  });

  it("counts only active wallets", () => {
    const archived = { id: "mandiri", openingBalance: 500_000, archived: true };
    expect(totalBalance([BCA, archived], [])).toBe(2_000_000);
  });
});
