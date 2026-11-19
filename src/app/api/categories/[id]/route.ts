import { NextResponse } from "next/server";
import { deleteCategory, updateCategory } from "@/server/categories";
import { handle, readJson, type RouteContext } from "@/server/http";
import { categoryPatchSchema } from "@/server/schemas";
import { currentUserId } from "@/server/session";

export const PATCH = (request: Request, { params }: RouteContext) =>
  handle(async () => {
    const userId = await currentUserId();
    const { id } = await params;
    await updateCategory(userId, id, categoryPatchSchema.parse(await readJson(request)));
    return NextResponse.json({ id });
  });

/** Only for a Kategori no Transaksi ever used (PRD 3.6). */
export const DELETE = (_request: Request, { params }: RouteContext) =>
  handle(async () => {
    await deleteCategory(await currentUserId(), (await params).id);
    return new Response(null, { status: 204 });
  });
