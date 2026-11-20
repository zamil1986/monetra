"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LANG, translator, type Lang, type Translate } from "@/domain/i18n";

const LangContext = createContext<Lang>(DEFAULT_LANG);

/** Hands the request's Bahasa, decided on the server, to every client component below it. */
export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** The translator for the Bahasa the page was rendered in. */
export function useT(): { t: Translate; lang: Lang } {
  const lang = useContext(LangContext);
  return useMemo(() => ({ t: translator(lang), lang }), [lang]);
}

/** Remembers a Bahasa in this browser, for the sign-in pages and after signing out. */
export function rememberLang(lang: Lang) {
  document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
