import { NextResponse } from "next/server";
import { z } from "zod";
import { isMessageKey, translate, type Lang } from "@/domain/i18n";
import { ServiceError } from "./errors";
import { requestLang } from "./i18n";

export type RouteContext<P extends string = "id"> = { params: Promise<Record<P, string>> };

const errorBody = (code: string, message: string, field?: string) => ({ error: { code, message, field } });

/** Only refusals are translated, so a request that succeeds never looks the Pengguna up for it. */
const lang = (): Promise<Lang> => requestLang().catch(() => "en" as const);

/** Runs a handler and turns refusals into JSON errors in the Pengguna's Bahasa, so services never deal with HTTP. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ServiceError) {
      return NextResponse.json(errorBody(e.code, translate(await lang(), e.key, e.params), e.field), { status: e.status });
    }
    if (e instanceof z.ZodError) {
      const issue = e.issues[0];
      const field = issue?.path.join(".") || undefined;
      // Schemas name their messages by catalog key; zod's own English messages become a generic refusal.
      const key = issue && isMessageKey(issue.message) ? issue.message : "error.invalidRequest";
      return NextResponse.json(errorBody("INVALID_REQUEST", translate(await lang(), key), field), { status: 400 });
    }
    console.error(e);
    return NextResponse.json(errorBody("INTERNAL", translate(await lang(), "error.internal")), { status: 500 });
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ServiceError(400, "INVALID_JSON", "error.invalidJson");
  }
}
