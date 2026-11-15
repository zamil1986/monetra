import { NextResponse } from "next/server";
import { handle, readJson } from "@/server/http";
import { walletCreateSchema } from "@/server/schemas";
import { currentUserId } from "@/server/session";
import { createWallet, listWallets } from "@/server/wallets";

export const GET = () => handle(async () => NextResponse.json(await listWallets(await currentUserId())));

export const POST = (request: Request) =>
  handle(async () => {
    const userId = await currentUserId();
    const input = walletCreateSchema.parse(await readJson(request));
    const wallet = await createWallet(userId, input);
    return NextResponse.json({ id: wallet.id }, { status: 201 });
  });
