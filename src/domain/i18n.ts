/*
 * Bahasa: the interface language a Pengguna picks (ADR 0006). One catalog per language lives in
 * shared/i18n and is read by the web and the Android app alike, so a text is translated once.
 * Names the Pengguna owns (Dompet, Kategori) are data and never pass through here.
 */
import en from "../../shared/i18n/en.json";
import id from "../../shared/i18n/id.json";

export const LANGS = ["en", "id"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";

export const isLang = (value: unknown): value is Lang => (LANGS as readonly unknown[]).includes(value);

type CatalogKey = keyof typeof en;
/** A plural pair `x.one` / `x.other` is asked for as `x`, with a `count` parameter. */
type Plural<K> = K extends `${infer Base}.one` ? Base : K extends `${infer Base}.other` ? Base : K;
export type MessageKey = Plural<CatalogKey>;
export type Params = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: Params) => string;

const CATALOGS: Record<Lang, Record<string, string>> = { en, id };

/**
 * The text for `key` in `lang`, with `{name}` placeholders filled in. A key holding a plural pair
 * picks `.one` when `count` is 1. An unknown key falls back to English, then to the key itself.
 */
export function translate(lang: Lang, key: MessageKey | string, params?: Params): string {
  const lookup = (catalog: Record<string, string>) => {
    if (key in catalog) return catalog[key];
    const count = params?.count;
    if (typeof count === "number") return catalog[`${key}.${count === 1 ? "one" : "other"}`];
    return undefined;
  };
  const text = lookup(CATALOGS[lang]) ?? lookup(CATALOGS.en) ?? key;
  return params ? text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole)) : text;
}

export const translator = (lang: Lang): Translate => (key, params) => translate(lang, key, params);

/** English, for tests and for messages that are rendered before any Pengguna is known. */
export const tEn = translator("en");

/** True when `key` names a text in the catalog, e.g. a zod message written as a key. */
export const isMessageKey = (key: string): key is MessageKey =>
  key in CATALOGS.en || `${key}.one` in CATALOGS.en;

/**
 * Picks a language from an Accept-Language header or a device locale ("id-ID,id;q=0.9,en;q=0.8"):
 * Indonesian when it is the first language named, otherwise English.
 */
export function langFromLocale(header: string | null | undefined): Lang {
  const first = header?.split(",")[0]?.trim().toLowerCase() ?? "";
  return first === "id" || first.startsWith("id-") || first === "in" || first.startsWith("in-") ? "id" : DEFAULT_LANG;
}
