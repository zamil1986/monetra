import { describe, expect, it } from "vitest";
import { checkArchive, checkDelete, validateWalletInput } from "./wallet-rules";

describe("archiving a Dompet", () => {
  it("is allowed when its Saldo is exactly Rp 0", () => {
    expect(checkArchive({ name: "GoPay", balance: 0 })).toEqual({ ok: true, value: undefined });
  });

  it("is refused with an explanation while Rp 50.000 remains (PRD 3.3)", () => {
    const result = checkArchive({ name: "GoPay", balance: 50_000 });
    expect(result).toEqual({
      ok: false,
      error: {
        code: "WALLET_NOT_EMPTY",
        message: "GoPay still holds Rp 50.000. A wallet can be archived only when its balance is exactly Rp 0.",
        key: "error.wallet.notEmpty.holds",
        params: { name: "GoPay", amount: "Rp 50.000" },
      },
    });
  });

  it("is refused while the Saldo is below zero", () => {
    const result = checkArchive({ name: "OVO", balance: -15_000 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("OVO is at −Rp 15.000.");
  });
});

describe("deleting a Dompet", () => {
  it("is allowed when it has never been used", () => {
    expect(checkDelete({ transactionCount: 0 }).ok).toBe(true);
  });

  it("is refused once it has a transaction, pointing to archive instead", () => {
    const result = checkDelete({ transactionCount: 41 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WALLET_IN_USE");
  });
});

describe("wallet details", () => {
  it("are trimmed and accepted with a name, opening balance, color and icon", () => {
    expect(validateWalletInput({ name: "  BCA ", openingBalance: 2_000_000, color: "blue", icon: "bank" })).toEqual({
      ok: true,
      value: { name: "BCA", openingBalance: 2_000_000, color: "blue", icon: "bank" },
    });
  });

  it("accept a negative opening balance, since a Saldo may be below zero (PRD 3.3 rule 3)", () => {
    const result = validateWalletInput({ name: "Kartu Kredit", openingBalance: -250_000, color: "slate", icon: "bank" });
    expect(result.ok && result.value.openingBalance).toBe(-250_000);
  });

  it.each([
    ["an empty name", { name: "  ", openingBalance: 0, color: "blue", icon: "bank" }, "name"],
    ["a name over 40 characters", { name: "x".repeat(41), openingBalance: 0, color: "blue", icon: "bank" }, "name"],
    ["a fractional opening balance", { name: "BCA", openingBalance: 10.5, color: "blue", icon: "bank" }, "openingBalance"],
    ["an unknown color", { name: "BCA", openingBalance: 0, color: "pink", icon: "bank" }, "color"],
    ["an unknown icon", { name: "BCA", openingBalance: 0, color: "blue", icon: "rocket" }, "icon"],
  ])("are refused with %s", (_label, input, field) => {
    const result = validateWalletInput(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.field).toBe(field);
  });
});
