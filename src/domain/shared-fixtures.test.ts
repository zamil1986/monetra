/*
 * The same cases run in mobile/test/shared_fixtures_test.dart (ADR 0005): the phone computes
 * Saldo and Periode offline, so both implementations must agree with this file exactly.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { balancesByWallet, totalBalance } from "./balance";
import { findNameClash, type ExistingCategory } from "./category-rules";
import { formatRupiah, keepAmountTyping, parseRupiah } from "./money";
import { cashFlow, periodRange, type Period } from "./period";
import type { CategoryType, Movement, WalletState } from "./types";

type Fixture = {
  balances: { name: string; wallets: WalletState[]; movements: Movement[]; expected: { byWallet: Record<string, number>; total: number } }[];
  cashFlow: { name: string; movements: Movement[]; expected: { income: number; expense: number; net: number } }[];
  periods: { name: string; period: Period; now: string; timeZone: string; expected: { from: string; to: string; start: string; endExclusive: string } }[];
  rupiah: { format: [number, string][]; parse: [string, number | null][]; keepTyped: [string, boolean, string][] };
  categoryNameClash: { existing: ExistingCategory[]; cases: { name: string; input: string; type: CategoryType; selfId: string | null; clashId: string | null }[] };
};

const fixture: Fixture = JSON.parse(readFileSync(join(process.cwd(), "shared/fixtures/domain.json"), "utf8"));

describe("shared fixtures: Saldo and Total Balance", () => {
  it.each(fixture.balances.map((c) => [c.name, c] as const))("%s", (_, c) => {
    expect(Object.fromEntries(balancesByWallet(c.wallets, c.movements))).toEqual(c.expected.byWallet);
    expect(totalBalance(c.wallets, c.movements)).toBe(c.expected.total);
  });
});

describe("shared fixtures: Net Cash Flow", () => {
  it.each(fixture.cashFlow.map((c) => [c.name, c] as const))("%s", (_, c) => {
    expect(cashFlow(c.movements)).toEqual(c.expected);
  });
});

describe("shared fixtures: Periode", () => {
  it.each(fixture.periods.map((c) => [c.name, c] as const))("%s", (_, c) => {
    const r = periodRange(c.period, new Date(c.now), c.timeZone);
    expect({ from: r.from, to: r.to, start: r.start.toISOString(), endExclusive: r.endExclusive.toISOString() }).toEqual(c.expected);
  });
});

describe("shared fixtures: Rupiah", () => {
  it.each(fixture.rupiah.format)("formats %d as %s", (value, text) => expect(formatRupiah(value)).toBe(text));
  it.each(fixture.rupiah.parse)("reads %j as %j", (input, value) => {
    const r = parseRupiah(input);
    expect(r.ok ? r.value : null).toBe(value);
  });
  it.each(fixture.rupiah.keepTyped)("keeps %j (minus allowed: %s) as %j", (input, allowMinus, kept) => {
    expect(keepAmountTyping(input, allowMinus)).toBe(kept);
  });
});

describe("shared fixtures: Kategori names", () => {
  const { existing, cases } = fixture.categoryNameClash;
  it.each(cases.map((c) => [c.name, c] as const))("%s", (_, c) => {
    expect(findNameClash(c.input, c.type, existing, c.selfId)?.id ?? null).toBe(c.clashId);
  });
});
