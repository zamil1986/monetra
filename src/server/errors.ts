import type { DomainError } from "@/domain/errors";

/** A refusal a route handler turns into an HTTP response. */
export class ServiceError extends Error {
  constructor(
    readonly status: 400 | 401 | 404 | 409 | 422,
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }

  static fromDomain(error: DomainError) {
    return new ServiceError(422, error.code, error.message, error.field);
  }

  static notFound(what: string) {
    return new ServiceError(404, "NOT_FOUND", `${what} not found.`);
  }
}
