import { NextResponse } from "next/server";
import { latestRelease } from "@/server/releases";

/** What the Android app asks on start to offer an update. Public: it runs before sign-in too. */
export async function GET() {
  const release = await latestRelease();
  if (!release) return NextResponse.json({ error: { code: "NO_RELEASE", message: "No Android build is published yet." } }, { status: 404 });
  return NextResponse.json({ version: release.version, apkUrl: release.apkUrl, publishedAt: release.publishedAt });
}
