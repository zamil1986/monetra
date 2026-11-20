import { NextResponse } from "next/server";
import { handle, readJson } from "@/server/http";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE } from "@/server/i18n";
import { languageSchema } from "@/server/schemas";
import { currentUserId } from "@/server/session";
import { setLanguage } from "@/server/users";

/** Changes the Pengguna's Bahasa from the web or a Perangkat; the newest choice wins (ADR 0006). */
export const POST = (request: Request) =>
  handle(async () => {
    const userId = await currentUserId();
    const { language, changedAt } = languageSchema.parse(await readJson(request));
    const result = await setLanguage(userId, language, changedAt);
    const response = NextResponse.json({ language: result });
    // Kept after signing out, so the sign-in page stays in the same Bahasa.
    response.cookies.set(LANG_COOKIE, result, { maxAge: LANG_COOKIE_MAX_AGE, path: "/", sameSite: "lax" });
    return response;
  });
