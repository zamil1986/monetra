import { describe, expect, it } from "vitest";
import { resolvePeriod } from "./period";

// Saturday 14 November 2026 in the profile timezone.
const today = "2026-11-14";

describe("Periode for the dashboard", () => {
  it("today covers just the current local day", () => {
    expect(resolvePeriod({ kind: "today" }, today)).toEqual({ ok: true, value: { kind: "today", from: "2026-11-14", to: "2026-11-14" } });
  });

  it("this week runs Monday to Sunday", () => {
    expect(resolvePeriod({ kind: "week" }, today)).toMatchObject({ ok: true, value: { from: "2026-11-09", to: "2026-11-15" } });
  });

  it("this week on a Sunday still starts on the Monday before", () => {
    expect(resolvePeriod({ kind: "week" }, "2026-11-15")).toMatchObject({ ok: true, value: { from: "2026-11-09", to: "2026-11-15" } });
  });

  it("this week on a Monday starts that day, across a month end", () => {
    expect(resolvePeriod({ kind: "week" }, "2026-11-30")).toMatchObject({ ok: true, value: { from: "2026-11-30", to: "2026-12-06" } });
  });

  it("this month covers the whole calendar month", () => {
    expect(resolvePeriod({ kind: "month" }, "2028-02-10")).toMatchObject({ ok: true, value: { from: "2028-02-01", to: "2028-02-29" } });
  });

  it("this year covers January to December", () => {
    expect(resolvePeriod({ kind: "year" }, today)).toMatchObject({ ok: true, value: { from: "2026-01-01", to: "2026-12-31" } });
  });

  it("custom uses the dates the person picked", () => {
    expect(resolvePeriod({ kind: "custom", from: "2026-10-01", to: "2026-10-15" }, today)).toEqual({
      ok: true,
      value: { kind: "custom", from: "2026-10-01", to: "2026-10-15" },
    });
  });

  it("custom refuses a range that ends before it starts", () => {
    expect(resolvePeriod({ kind: "custom", from: "2026-10-15", to: "2026-10-01" }, today)).toMatchObject({
      ok: false,
      error: { code: "INVALID_PERIOD", field: "to" },
    });
  });

  it("custom refuses a missing or impossible date", () => {
    expect(resolvePeriod({ kind: "custom", from: "2026-10-01" }, today)).toMatchObject({ ok: false, error: { field: "to" } });
    expect(resolvePeriod({ kind: "custom", from: "2026-02-30", to: "2026-03-01" }, today)).toMatchObject({ ok: false, error: { field: "from" } });
  });
});
