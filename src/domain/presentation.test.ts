import { describe, expect, it } from "vitest";
import { transactionTitle } from "./presentation";

describe("transaction title in the history (PRD 3.5)", () => {
  it("is the description when there is one", () => {
    expect(transactionTitle({ type: "EXPENSE", description: "Iced coffee", categoryName: "Food", toWalletName: null })).toBe("Iced coffee");
  });

  it("falls back to the category name", () => {
    expect(transactionTitle({ type: "EXPENSE", description: null, categoryName: "Food", toWalletName: null })).toBe("Food");
  });

  it("names the destination for a transfer without a description", () => {
    expect(transactionTitle({ type: "TRANSFER", description: null, categoryName: null, toWalletName: "GoPay" })).toBe("Transfer to GoPay");
  });
});
