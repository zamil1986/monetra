/**
 * The Theme a Perangkat shows Monetra in. Unlike the Bahasa it belongs to the Perangkat, not the Akun:
 * the Mac can stay light while the phone goes dark (ADR 0007). `system` follows the OS and is the default.
 */
export const THEMES = ["system", "light", "dark"] as const;
export type ThemePref = (typeof THEMES)[number];
export const DEFAULT_THEME: ThemePref = "system";

/** Remembers the Theme in this browser for a year; read on the server so the first paint is already right. */
export const THEME_COOKIE = "theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const isTheme = (value: unknown): value is ThemePref => THEMES.includes(value as ThemePref);

/** The stored choice, or the default when nothing (or something unknown) was stored. */
export const themeOrDefault = (value: unknown): ThemePref => (isTheme(value) ? value : DEFAULT_THEME);
