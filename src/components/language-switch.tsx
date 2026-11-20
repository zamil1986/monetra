"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LANGS, type Lang } from "@/domain/i18n";
import { api } from "@/lib/api";
import { rememberLang, useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";
import { FieldError, segButtonClass, segClass } from "./ui";

/**
 * Picks the Bahasa. Signed in, the choice is saved to the Akun and follows the Pengguna to every
 * Perangkat; on the sign-in pages it is remembered in this browser and saved at sign-up (ADR 0006).
 */
export function LanguageSwitch({ saveToAccount, short = false, className }: { saveToAccount: boolean; short?: boolean; className?: string }) {
  const router = useRouter();
  const { t, lang } = useT();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function choose(next: Lang) {
    if (next === lang || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      if (saveToAccount) await api("/api/profile/language", { method: "POST", body: { language: next, changedAt: new Date().toISOString() } });
      rememberLang(next);
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <div className={cn(segClass, short && "inline-flex")} role="group" aria-label={t("lang.label")}>
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            className={cn(segButtonClass, short && "min-h-9 px-3 text-sm")}
            aria-pressed={lang === l}
            aria-label={short ? t(`lang.${l}`) : undefined}
            disabled={busy}
            onClick={() => choose(l)}
          >
            {short ? t(`lang.short.${l}`) : t(`lang.${l}`)}
          </button>
        ))}
      </div>
      {failed && <div className="mt-2"><FieldError message={t("settings.languageFailed")} /></div>}
    </div>
  );
}
