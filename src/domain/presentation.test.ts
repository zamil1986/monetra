import { describe, expect, it } from "vitest";
import { daySummary, demoTimeLeft, transactionTitle } from "./presentation";

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

describe("demo time left", () => {
  const now = new Date("2026-11-19T10:00:00Z");
  const at = (ms: number) => new Date(now.getTime() + ms);

  it("counts whole hours while an hour or more is left", () => {
    expect(demoTimeLeft(at(23 * 3600_000 + 59 * 60_000), now)).toBe("expires in 23h");
    expect(demoTimeLeft(at(3600_000), now)).toBe("expires in 1h");
  });

  it("counts minutes in the last hour", () => {
    expect(demoTimeLeft(at(59 * 60_000 + 30_000), now)).toBe("expires in 59m");
    expect(demoTimeLeft(at(20_000), now)).toBe("expires in 1m");
  });

  it("says it is expiring once the time is up", () => {
    expect(demoTimeLeft(now, now)).toBe("expiring now");
    expect(demoTimeLeft(at(-5000), now)).toBe("expiring now");
  });
});

describe("day summary in the history", () => {
  it("shows what was spent when there is any expense", () => {
    expect(daySummary({ spent: 284000, received: 1000000 })).toBe("Rp 284.000 spent");
  });

  it("shows what came in on a day with income but no expense", () => {
    expect(daySummary({ spent: 0, received: 4500000 })).toBe("+Rp 4.500.000 in");
  });

  it("is empty on a day with only transfers", () => {
    expect(daySummary({ spent: 0, received: 0 })).toBe("");
  });
});
