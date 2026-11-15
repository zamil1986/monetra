import { NextResponse } from "next/server";
import { z } from "zod";
import { ServiceError } from "./errors";

export type RouteContext<P extends string = "id"> = { params: Promise<Record<P, string>> };

const errorBody = (code: string, message: string, field?: string) => ({ error: { code, message, field } });

/** Runs a handler and turns refusals into JSON errors, so services never deal with HTTP. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json(errorBody(e.code, e.message, e.field), { status: e.status });
    if (e instanceof z.ZodError) {
      const issue = e.issues[0];
      const field = issue?.path.join(".") || undefined;
      return NextResponse.json(errorBody("INVALID_REQUEST", issue?.message ?? "Invalid request.", field), { status: 400 });
    }
    console.error(e);
    return NextResponse.json(errorBody("INTERNAL", "Something went wrong. Try again."), { status: 500 });
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ServiceError(400, "INVALID_JSON", "The request body must be JSON.");
  }
}
