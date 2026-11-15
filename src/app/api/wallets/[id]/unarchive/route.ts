import { handle, type RouteContext } from "@/server/http";
import { currentUserId } from "@/server/session";
import { unarchiveWallet } from "@/server/wallets";

export const POST = (_request: Request, { params }: RouteContext) =>
  handle(async () => {
    await unarchiveWallet(await currentUserId(), (await params).id);
    return new Response(null, { status: 204 });
  });
