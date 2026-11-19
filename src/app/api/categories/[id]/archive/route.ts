import { archiveCategory } from "@/server/categories";
import { handle, type RouteContext } from "@/server/http";
import { currentUserId } from "@/server/session";

export const POST = (_request: Request, { params }: RouteContext) =>
  handle(async () => {
    await archiveCategory(await currentUserId(), (await params).id);
    return new Response(null, { status: 204 });
  });
