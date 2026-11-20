import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { Metadata } from "next";
import { isLang, langFromLocale, translator, type Lang, type MessageKey } from "@/domain/i18n";
import { auth } from "./auth";

/** Remembers the Bahasa picked before signing in, and the last one after signing out. */
export const LANG_COOKIE = "lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * The Bahasa for this request: the signed-in Pengguna's, else the one picked on the sign-in
 * page, else the browser's or phone's own language (ADR 0006).
 */
export const requestLang = cache(async (): Promise<Lang> => {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h }).catch(() => null);
  const own = session?.user.language;
  if (isLang(own)) return own;
  const picked = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(picked)) return picked;
  return langFromLocale(h.get("accept-language"));
});

/** For server components and route handlers: the translator for this request, and its Bahasa. */
export async function getT() {
  const lang = await requestLang();
  return { lang, t: translator(lang) };
}

/** A page's `generateMetadata` that titles it in the request's Bahasa. */
export const titled = (key: MessageKey) => async (): Promise<Metadata> => ({ title: (await getT()).t(key) });
