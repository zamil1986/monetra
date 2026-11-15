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

/** The client sends the ID (ADR 0003): 201 when recorded, 200 when this is a retry of a recorded one. */
export const POST = (request: Request) =>
  handle(async () => {
    const userId = await currentUserId();
    const input = transactionCreateSchema.parse(await readJson(request));
    const { transaction, created } = await createTransaction(userId, input);
    return NextResponse.json(transaction, { status: created ? 201 : 200 });
  });
