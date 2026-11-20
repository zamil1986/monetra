import { tEn, type MessageKey, type Params } from "./i18n";

/**
 * A business-rule refusal the UI can show. `field` points at the form input to blame.
 * `key` and `params` let each Perangkat render it in the Pengguna's Bahasa; `message` is the English text.
 */
export type DomainError = {
  code: string;
  message: string;
  field?: string;
  key: MessageKey;
  params?: Params;
};

export function domainError(code: string, key: MessageKey, params?: Params, field?: string): DomainError {
  return { code, key, message: tEn(key, params), ...(params ? { params } : {}), ...(field ? { field } : {}) };
}
