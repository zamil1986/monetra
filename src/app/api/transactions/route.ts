import { NextResponse } from "next/server";
import { handle, readJson } from "@/server/http";
import { transactionCreateSchema, transactionQuerySchema } from "@/server/schemas";
import { currentUserId } from "@/server/session";
import { createTransaction, listTransactions } from "@/server/transactions";

export const GET = (request: Request) =>
  handle(async () => {
    const userId = await currentUserId();
    const query = Object.fromEntries(new URL(request.url).searchParams);
    return NextResponse.json(await listTransactions(userId, transactionQuerySchema.parse(query)));
  });

export const POST = (request: Request) =>
  handle(async () => {
    const userId = await currentUserId();
    const input = transactionCreateSchema.parse(await readJson(request));
    return NextResponse.json(await createTransaction(userId, input), { status: 201 });
  });
