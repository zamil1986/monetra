import { cookies } from "next/headers";
import { THEME_COOKIE, themeOrDefault, type ThemePref } from "@/domain/theme";

/** This Perangkat's Theme, from its cookie (ADR 0007). Not stored on the Akun. */
export async function requestTheme(): Promise<ThemePref> {
  return themeOrDefault((await cookies()).get(THEME_COOKIE)?.value);
}
