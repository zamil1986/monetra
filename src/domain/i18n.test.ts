/*
 * The same parity check runs in mobile/test/i18n_test.dart: both catalogs must offer every text,
 * with the same placeholders, or one Bahasa silently shows the other's words (ADR 0006).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dayLabel, fullDate, monthShort } from "@/lib/dates";
import { domainError } from "./errors";
import { isMessageKey, langFromLocale, translate, translator } from "./i18n";
import { daySummary, demoTimeLeft, transactionTitle } from "./presentation";

const catalog = (lang: string): Record<string, string> =>
  JSON.parse(readFileSync(join(process.cwd(), `shared/i18n/${lang}.json`), "utf8"));
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const tags = (text: string) => [...text.matchAll(/<(\w+)>/g)].map((m) => m[1]).sort();

describe("catalogs", () => {
  const en = catalog("en");
  const id = catalog("id");

  it("have the same keys", () => {
    expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort());
  });

  it.each(Object.keys(en))("%s keeps its placeholders and markup in Indonesian", (key) => {
    expect(placeholders(id[key]!)).toEqual(placeholders(en[key]!));
    expect(tags(id[key]!)).toEqual(tags(en[key]!));
  });

  it("leave no text empty", () => {
    for (const [key, text] of [...Object.entries(en), ...Object.entries(id)]) expect(text, key).not.toBe("");
  });
});

describe("translate", () => {
  it("fills placeholders", () => {
    expect(translate("id", "tx.transferTo", { wallet: "GoPay" })).toBe("Transfer ke GoPay");
    expect(translate("en", "tx.transferTo", { wallet: "GoPay" })).toBe("Transfer to GoPay");
  });

  it("picks the plural form by count", () => {
    expect(translate("en", "tx.count", { count: 1 })).toBe("1 transaction");
    expect(translate("en", "tx.count", { count: 3 })).toBe("3 transactions");
    expect(translate("id", "tx.count", { count: 3 })).toBe("3 transaksi");
  });

  it("knows which strings are catalog keys", () => {
    expect(isMessageKey("error.amount.whole")).toBe(true);
    expect(isMessageKey("tx.count")).toBe(true);
    expect(isMessageKey("Expected number, received string")).toBe(false);
  });

  it("renders a refusal in either Bahasa from the same error", () => {
    const e = domainError("WALLET_ARCHIVED", "error.wallet.archivedEdit", { name: "OVO" });
    expect(e.message).toBe("OVO is archived. Unarchive it to make changes.");
    expect(translate("id", e.key, e.params)).toBe("OVO diarsip. Keluarkan dari Arsip untuk mengubahnya.");
  });
});

describe("Bahasa from a browser or phone locale", () => {
  it.each([
    ["id-ID,id;q=0.9,en;q=0.8", "id"],
    ["id", "id"],
    ["in-ID", "id"],
    ["en-US,en;q=0.9,id;q=0.8", "en"],
    ["fr-FR", "en"],
    ["", "en"],
    [null, "en"],
  ])("%j reads as %s", (header, lang) => expect(langFromLocale(header)).toBe(lang));
});

describe("Indonesian dates and labels", () => {
  const t = translator("id");

  it("names days and months in Indonesian", () => {
    expect(dayLabel("2026-11-19", "id")).toBe("Kam 19 Nov");
    expect(monthShort("2026-08-01", "id")).toBe("Agu");
    expect(fullDate("2026-08-17", "id")).toBe("17 Agustus 2026");
    expect(dayLabel("2026-11-19", "en")).toBe("Thu 19 Nov");
  });

  it("titles, day summaries and demo time follow the Bahasa", () => {
    expect(transactionTitle({ type: "TRANSFER", description: null, categoryName: null, toWalletName: "BCA" }, t)).toBe("Transfer ke BCA");
    expect(daySummary({ spent: 284000, received: 0 }, t)).toBe("Rp 284.000 keluar");
    const now = new Date("2026-11-19T10:00:00Z");
    expect(demoTimeLeft(new Date(now.getTime() + 5 * 3600_000), now, t)).toBe("berakhir dalam 5 jam");
  });
});
