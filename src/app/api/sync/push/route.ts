import { NextResponse } from "next/server";
import { handle, readJson } from "@/server/http";
import { currentUserId } from "@/server/session";
import { push, pushSchema } from "@/server/sync";

/** A Perangkat's queued changes, oldest first (ADR 0005). */
export const POST = (request: Request) =>
  handle(async () => {
    const userId = await currentUserId();
    const { mutations } = pushSchema.parse(await readJson(request));
    return NextResponse.json(await push(userId, mutations));
  });
