import { NextResponse } from "next/server";
import { handle, readJson, type RouteContext } from "@/server/http";
import { transactionPatchSchema } from "@/server/schemas";
import { currentUserId } from "@/server/session";
import { deleteTransaction, getTransaction, updateTransaction } from "@/server/transactions";

export const GET = (_request: Request, { params }: RouteContext) =>
  handle(async () => NextResponse.json(await getTransaction(await currentUserId(), (await params).id)));

export const PATCH = (request: Request, { params }: RouteContext) =>
  handle(async () => {
    const userId = await currentUserId();
    const patch = transactionPatchSchema.parse(await readJson(request));
    return NextResponse.json(await updateTransaction(userId, (await params).id, patch));
  });

export const DELETE = (_request: Request, { params }: RouteContext) =>
  handle(async () => {
    await deleteTransaction(await currentUserId(), (await params).id);
    return new Response(null, { status: 204 });
  });
