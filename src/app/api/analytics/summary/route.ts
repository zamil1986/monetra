import { NextResponse } from "next/server";
import { getDashboard } from "@/server/dashboard";
import { handle } from "@/server/http";
import { dashboardQuerySchema } from "@/server/schemas";
import { currentUserId } from "@/server/session";

/** PRD 3.2 and 8: the dashboard figures for one Periode, e.g. `?period=custom&from=2026-11-01&to=2026-11-14`. */
export const GET = (request: Request) =>
  handle(async () => {
    const userId = await currentUserId();
    const { period: kind, from, to } = dashboardQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return NextResponse.json(await getDashboard(userId, { kind, from, to }));
  });
