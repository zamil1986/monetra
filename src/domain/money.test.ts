import { describe, expect, it } from "vitest";
import { parseRupiah } from "./money";

describe("parseRupiah", () => {
  it("reads a typed amount with Indonesian thousand separators as whole rupiah", () => {
    expect(parseRupiah("18.000")).toEqual({ ok: true, value: 18000 });
  });
});

describe("parseRupiah rejects what is not a whole rupiah amount", () => {
  it.each([
    ["empty", ""],
    ["letters", "abc"],
    ["a decimal comma", "18.000,50"],
    ["a misplaced separator", "18.00"],
  ])("%s", (_label, input) => {
    expect(parseRupiah(input).ok).toBe(false);
  });

  it("reads a leading minus as a negative amount", () => {
    expect(parseRupiah("-15.000")).toEqual({ ok: true, value: -15000 });
    expect(parseRupiah("−Rp 15.000")).toEqual({ ok: true, value: -15000 });
    expect(parseRupiah("-0")).toEqual({ ok: true, value: 0 });
  });

  it("accepts plain digits, spaces and an Rp prefix", () => {
    expect(parseRupiah("Rp 2.000.000")).toEqual({ ok: true, value: 2000000 });
    expect(parseRupiah(" 1500 ")).toEqual({ ok: true, value: 1500 });
    expect(parseRupiah("0")).toEqual({ ok: true, value: 0 });
  });
});
