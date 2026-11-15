import { NextResponse } from "next/server";
import { handle, readJson, type RouteContext } from "@/server/http";
import { walletPatchSchema } from "@/server/schemas";
import { currentUserId } from "@/server/session";
import { deleteWallet, updateWallet } from "@/server/wallets";

export const PATCH = (request: Request, { params }: RouteContext) =>
  handle(async () => {
    const userId = await currentUserId();
    const { id } = await params;
    await updateWallet(userId, id, walletPatchSchema.parse(await readJson(request)));
    return NextResponse.json({ id });
  });

/** Only for a Dompet that was never used (PRD 3.3 rule 6). */
export const DELETE = (_request: Request, { params }: RouteContext) =>
  handle(async () => {
    const userId = await currentUserId();
    await deleteWallet(userId, (await params).id);
    return new Response(null, { status: 204 });
  });
