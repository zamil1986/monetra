import { describe, expect, it } from "vitest";
import { localDayRange, localToInstant, instantToLocal } from "./local-time";

describe("local time in the profile's timezone", () => {
  it("turns a date and time typed in Jakarta into one unambiguous instant", () => {
    expect(localToInstant("2026-11-14", "15:42", "Asia/Jakarta").toISOString()).toBe("2026-11-14T08:42:00.000Z");
  });

  it("reads an instant back as the date and time shown in Jakarta", () => {
    expect(instantToLocal(new Date("2026-11-13T18:30:00Z"), "Asia/Jakarta")).toEqual({ date: "2026-11-14", time: "01:30" });
  });

  it("covers whole local days from the start of the first to the end of the last", () => {
    const range = localDayRange("2026-11-01", "2026-11-14", "Asia/Jakarta");
    expect(range.start.toISOString()).toBe("2026-10-31T17:00:00.000Z");
    expect(range.endExclusive.toISOString()).toBe("2026-11-14T17:00:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(Number.isNaN(localToInstant("14/11/2026", "15:42", "Asia/Jakarta").getTime())).toBe(true);
  });

  it("rejects a date that does not exist instead of rolling into the next month", () => {
    expect(Number.isNaN(localToInstant("2026-02-31", "10:00", "Asia/Jakarta").getTime())).toBe(true);
  });
});
