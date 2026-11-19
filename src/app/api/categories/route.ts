import { NextResponse } from "next/server";
import { createCategory, listCategories } from "@/server/categories";
import { handle, readJson } from "@/server/http";
import { categoryCreateSchema } from "@/server/schemas";
import { currentUserId } from "@/server/session";

export const GET = () => handle(async () => NextResponse.json({ categories: await listCategories(await currentUserId()) }));

export const POST = (request: Request) =>
  handle(async () => {
    const userId = await currentUserId();
    const category = await createCategory(userId, categoryCreateSchema.parse(await readJson(request)));
    return NextResponse.json({ id: category.id }, { status: 201 });
  });
