import { isLang, translate } from "@/domain/i18n";

/** The page's Bahasa, for the few messages made in the browser rather than by the server. */
const pageLang = () => (typeof document !== "undefined" && isLang(document.documentElement.lang) ? document.documentElement.lang : "en");

/** A refusal from the REST API, carrying the form field to blame when there is one. */
export class ApiError extends Error {
  constructor(readonly code: string, message: string, readonly field?: string, readonly status = 0) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init?.method ?? "GET",
      headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError("NETWORK", translate(pageLang(), "error.network"));
  }
  if (response.status === 204) return undefined as T;
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const e = json?.error;
    throw new ApiError(e?.code ?? "UNKNOWN", e?.message ?? translate(pageLang(), "error.internal"), e?.field, response.status);
  }
  return json as T;
}
