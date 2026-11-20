import type { DomainError } from "@/domain/errors";
import { tEn, type MessageKey, type Params } from "@/domain/i18n";

type Status = 400 | 401 | 404 | 409 | 422;

/**
 * A refusal a route handler turns into an HTTP response. `message` is English; `key` and `params`
 * let the handler render it in the Pengguna's Bahasa instead.
 */
export class ServiceError extends Error {
  constructor(
    readonly status: Status,
    readonly code: string,
    readonly key: MessageKey,
    readonly params?: Params,
    readonly field?: string,
  ) {
    super(tEn(key, params));
  }

  static fromDomain(error: DomainError) {
    return new ServiceError(422, error.code, error.key, error.params, error.field);
  }

  static notFound(what: "wallet" | "category" | "transaction" | "user") {
    return new ServiceError(404, "NOT_FOUND", `error.notFound.${what}`);
  }
}
