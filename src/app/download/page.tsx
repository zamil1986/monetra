import { Download, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Notice, buttonClass, cx, h1, h2, muted } from "@/components/ui";
import { latestRelease } from "@/server/releases";

export const metadata: Metadata = { title: "Download for Android" };
export const revalidate = 600;

const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

/** Public page: a free APK from a URL, no app store (ADR 0005). */
export default async function DownloadPage() {
  const release = await latestRelease();
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col gap-8 px-4 py-10 pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <span className="fig block text-2xl font-black leading-none text-cobalt [&_b]:text-yellow">MONETRA<b>.</b></span>
      <div>
        <h1 className={h1}>Monetra for Android</h1>
        <p className={cx(muted, "mt-2")}>Record income, expenses and transfers on your phone, even without signal. Everything syncs with the web when you&apos;re back online.</p>
      </div>

      {release ? (
        <div className="flex flex-col gap-2">
          <a className={buttonClass("primary", "lg", "w-full")} href={release.apkUrl}><Download />Download Monetra {release.version} (APK, {mb(release.sizeBytes)})</a>
          <p className={cx("text-meta", muted)}>
            Free. Released {new Date(release.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. <a href={release.pageUrl}>Release notes</a>
          </p>
        </div>
      ) : (
        <Notice tone="info" role="status"><strong>No Android build is published yet.</strong> Check back soon.</Notice>
      )}

      <section aria-labelledby="install" className="flex flex-col gap-3">
        <h2 id="install" className={h2}>Install it</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>Open this page on your Android phone and tap <strong>Download</strong>.</li>
          <li>Open the downloaded file. Android asks to allow installs from your browser the first time: allow it for this install.</li>
          <li>Tap <strong>Install</strong>, then sign in with your Monetra account. The first sign-in needs a connection.</li>
        </ol>
        <p className={cx("text-meta", muted)}>Updating: download the new version and install it over the old one. Your data stays. The app tells you when a new version is out.</p>
      </section>

      <ul className="flex flex-col gap-3">
        <li className="flex gap-3"><WifiOff className="mt-0.5 shrink-0" /><span><strong>Works offline.</strong> Balances and the dashboard are worked out on the phone.</span></li>
        <li className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0" /><span><strong>Same account as the web.</strong> Your session is kept in Android&apos;s secure storage.</span></li>
        <li className="flex gap-3"><Smartphone className="mt-0.5 shrink-0" /><span><strong>Android 6 or newer.</strong> iPhone isn&apos;t supported yet; use the web app in Safari meanwhile.</span></li>
      </ul>

      <p><Link href="/login">Use Monetra on the web instead</Link></p>
    </main>
  );
}
