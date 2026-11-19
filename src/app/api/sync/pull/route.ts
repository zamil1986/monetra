import { NextResponse, type NextRequest } from "next/server";
import { handle } from "@/server/http";
import { currentUserId } from "@/server/session";
import { pull, pullQuerySchema } from "@/server/sync";

/** Everything that changed after the cursor, deletions included (ADR 0005). */
export const GET = (request: NextRequest) =>
  handle(async () => {
    const userId = await currentUserId();
    const { since } = pullQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    return NextResponse.json(await pull(userId, BigInt(since)));
  });
