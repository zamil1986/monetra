import { NextResponse } from "next/server";
import { listCategories } from "@/server/categories";
import { handle } from "@/server/http";
import { currentUserId } from "@/server/session";

export const GET = () => handle(async () => NextResponse.json({ categories: await listCategories(await currentUserId()) }));
