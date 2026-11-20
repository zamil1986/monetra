import { describe, expect, it } from "vitest";
import { barCap, barWidth, bucketByDay, compactRupiah, monthBounds, monthGrid, readDay, readMonth, shiftMonth } from "./calendar";

// Friday 20 November 2026 in the profile timezone.
const today = "2026-11-20";

describe("months", () => {
  it("knows each month's last day, leap years included", () => {
    expect(monthBounds("2026-11")).toEqual({ first: "2026-11-01", last: "2026-11-30" });
    expect(monthBounds("2028-02").last).toBe("2028-02-29");
  });

  it("steps across a year end", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("reads a past month and refuses the future or nonsense", () => {
    expect(readMonth("2026-10", today)).toBe("2026-10");
    expect(readMonth("2026-12", today)).toBe("2026-11");
    expect(readMonth("2026-13", today)).toBe("2026-11");
    expect(readMonth("nov", today)).toBe("2026-11");
    expect(readMonth(undefined, today)).toBe("2026-11");
  });
});

describe("the selected day", () => {
  it("defaults to today in the current month and to nothing in a past one", () => {
    expect(readDay(undefined, "2026-11", today)).toBe("2026-11-20");
    expect(readDay(undefined, "2026-10", today)).toBeNull();
  });

  it("keeps a real past day inside the month", () => {
    expect(readDay("2026-11-03", "2026-11", today)).toBe("2026-11-03");
    expect(readDay("2026-10-31", "2026-10", today)).toBe("2026-10-31");
  });

  it("refuses a future day, a day of another month and a date that doesn't exist", () => {
    expect(readDay("2026-11-25", "2026-11", today)).toBe("2026-11-20");
    expect(readDay("2026-10-03", "2026-11", today)).toBe("2026-11-20");
    expect(readDay("2026-02-30", "2026-02", today)).toBeNull();
  });
});

describe("month grid", () => {
  it("starts on Monday: 1 November 2026 is a Sunday, so six blanks come first", () => {
    const grid = monthGrid("2026-11");
    expect(grid.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(grid.length % 7).toBe(0);
    expect(grid.filter(Boolean)).toHaveLength(30);
    expect(grid.at(-1)).toBeNull();
  });

  it("has no blanks when the month starts on a Monday", () => {
    expect(monthGrid("2027-02")[0]).toBe("2027-02-01");
  });
});

describe("totals per day", () => {
  const tz = "Asia/Jakarta";

  it("buckets by the local day, not the UTC day", () => {
    // 23:30 Jakarta on 19 Nov is 16:30 UTC; 00:30 Jakarta on 20 Nov is still 19 Nov in UTC.
    const days = bucketByDay(
      [
        { type: "EXPENSE", amount: 24000, occurredAt: new Date("2026-11-19T16:30:00Z") },
        { type: "EXPENSE", amount: 18000, occurredAt: new Date("2026-11-19T17:30:00Z") },
      ],
      tz,
    );
    expect(days).toEqual({
      "2026-11-19": { expense: 24000, income: 0, count: 1 },
      "2026-11-20": { expense: 18000, income: 0, count: 1 },
    });
  });

  it("keeps Income apart and never counts a Transfer as spending", () => {
    const at = new Date("2026-11-05T03:00:00Z");
    const days = bucketByDay(
      [
        { type: "INCOME", amount: 7_500_000, occurredAt: at },
        { type: "TRANSFER", amount: 300_000, occurredAt: at },
        { type: "EXPENSE", amount: 28_000, occurredAt: at },
      ],
      tz,
    );
    expect(days["2026-11-05"]).toEqual({ expense: 28_000, income: 7_500_000, count: 3 });
  });
});

describe("bars", () => {
  it("caps the scale near the 85th percentile so one big day doesn't flatten the rest", () => {
    const month = [185000, 84000, 1_250_000, 74000, 83000, 58000, 410000, 265000, 88000, 47000, 121000, 310000, 92000, 284000, 80000, 54000, 121000, 113000, 126000, 90000];
    const cap = barCap(month);
    expect(barWidth(1_250_000, cap)).toBe(100);
    // On a straight scale to the rent day, Rp 90.000 would be a 7% sliver.
    expect(barWidth(90000, cap)).toBeGreaterThan(20);
  });

  it("draws nothing for a day without spending and a sliver for a tiny one", () => {
    expect(barWidth(0, 100000)).toBe(0);
    expect(barWidth(500, 100000)).toBe(2);
    expect(barCap([])).toBe(1);
  });
});

describe("compact amounts", () => {
  it("reads in English", () => {
    expect(compactRupiah(18000, "en")).toBe("18K");
    expect(compactRupiah(1_250_000, "en")).toBe("1.25M");
    expect(compactRupiah(2_000_000, "en")).toBe("2M");
    expect(compactRupiah(999_600, "en")).toBe("1M");
    expect(compactRupiah(500, "en")).toBe("500");
  });

  it("reads in Indonesian", () => {
    expect(compactRupiah(18000, "id")).toBe("18rb");
    expect(compactRupiah(1_250_000, "id")).toBe("1,25jt");
    expect(compactRupiah(1_500_000_000, "id")).toBe("1,5M");
  });
});
