import { isMessageKey, type MessageKey, type Translate } from "@/domain/i18n";

/** A Better Auth refusal in the page's Bahasa: known codes are translated, the rest get `fallback`. */
export function authErrorMessage(t: Translate, error: { code?: string; status?: number }, fallback: MessageKey): string {
  const key = `auth.error.${error.code}`;
  if (error.code && isMessageKey(key)) return t(key);
  return t(fallback);
}
