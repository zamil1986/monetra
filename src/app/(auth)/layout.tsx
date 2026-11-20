import type { ReactNode } from "react";
import { LanguageSwitch } from "@/components/language-switch";
import { getT } from "@/server/i18n";

/** Sign-in screens: cobalt pitch on the left (desktop only), the form on the right. */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = await getT();
  return (
    <div className="grid min-h-dvh bg-background md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-cobalt p-10 text-on-cobalt md:flex">
        <span className="fig block text-[28px] font-black leading-none text-white [&_b]:text-yellow">MONETRA<b>.</b></span>
        <div className="max-w-[40ch]">
          <h2 className="text-3xl font-bold leading-tight text-white">{t("auth.pitch.title")}</h2>
          <p className="mt-3">{t("auth.pitch.body")}</p>
        </div>
        <span className="text-meta">{t("auth.pitch.foot")}</span>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 pt-[calc(2.5rem+env(safe-area-inset-top))]">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center justify-between gap-3 md:justify-end">
            <span className="fig block text-2xl font-black leading-none text-cobalt md:hidden [&_b]:text-yellow">MONETRA<b>.</b></span>
            {/* Before signing in the Bahasa follows the browser; picking one here is remembered and kept at sign-up. */}
            <LanguageSwitch saveToAccount={false} short />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
