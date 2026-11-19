/**
 * The newest Android build, read from GitHub Releases (ADR 0005: the APK is downloaded from a
 * public URL, no app store). The repository must be public for its assets to download.
 */
const REPO = process.env.GITHUB_RELEASES_REPO ?? "zamil1986/monetra";

export type LatestRelease = {
  version: string;
  apkUrl: string;
  sizeBytes: number;
  publishedAt: string;
  notes: string;
  pageUrl: string;
};

type GitHubRelease = {
  tag_name: string;
  html_url: string;
  body: string | null;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: { name: string; browser_download_url: string; size: number }[];
};

/** Null when there is no release yet, or GitHub can't be reached. Cached for ten minutes. */
export async function latestRelease(): Promise<LatestRelease | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { accept: "application/vnd.github+json" },
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const r = (await res.json()) as GitHubRelease;
    // The universal APK installs on every phone; the per-ABI ones are smaller extras.
    const apk = r.assets.find((a) => a.name === "monetra.apk") ?? r.assets.find((a) => a.name.endsWith(".apk"));
    if (!apk) return null;
    return {
      version: r.tag_name.replace(/^v/, ""),
      apkUrl: apk.browser_download_url,
      sizeBytes: apk.size,
      publishedAt: r.published_at,
      notes: r.body ?? "",
      pageUrl: r.html_url,
    };
  } catch {
    return null;
  }
}
