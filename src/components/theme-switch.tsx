"use client";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { THEMES, THEME_COOKIE, THEME_COOKIE_MAX_AGE, type ThemePref } from "@/domain/theme";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";
import { segButtonClass, segClass } from "./ui";

const ICONS: Record<ThemePref, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };

/**
 * Picks the Theme for this Perangkat only (ADR 0007): a cookie the server reads on the next render.
 * The page switches at once by setting <html data-theme>; the refresh keeps the server render in step.
 */
export function ThemeSwitch({ initial, className }: { initial: ThemePref; className?: string }) {
  const router = useRouter();
  const { t } = useT();
  const [theme, setTheme] = useState<ThemePref>(initial);

  function choose(next: ThemePref) {
    if (next === theme) return;
    setTheme(next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
    document.documentElement.dataset.theme = next;
    router.refresh();
  }

  return (
    <div className={cn(segClass, className)} role="group" aria-label={t("theme.label")}>
      {THEMES.map((value) => {
        const Icon = ICONS[value];
        return (
          <button key={value} type="button" className={segButtonClass} aria-pressed={theme === value} onClick={() => choose(value)}>
            <Icon aria-hidden />
            {t(`theme.${value}`)}
          </button>
        );
      })}
    </div>
  );
}
