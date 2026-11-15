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
    throw new ApiError("NETWORK", "The connection dropped. What you typed is still here, and saving again won't create a duplicate.");
  }
  if (response.status === 204) return undefined as T;
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const e = json?.error;
    throw new ApiError(e?.code ?? "UNKNOWN", e?.message ?? "Something went wrong. Try again.", e?.field, response.status);
  }
  return json as T;
}
