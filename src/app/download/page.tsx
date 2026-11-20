import { Download, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import Link from "next/link";
import { Rich } from "@/components/rich";
import { Notice, buttonClass, cx, h1, h2, muted } from "@/components/ui";
import { fullDate } from "@/lib/dates";
import { getT, titled } from "@/server/i18n";
import { latestRelease } from "@/server/releases";

export const generateMetadata = titled("download.metaTitle");

const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

/** Public page: a free APK from a URL, no app store (ADR 0005). Rendered per request, in the visitor's Bahasa. */
export default async function DownloadPage() {
  const [release, { t, lang }] = await Promise.all([latestRelease(), getT()]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col gap-8 px-4 py-10 pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <span className="fig block text-2xl font-black leading-none text-cobalt [&_b]:text-yellow">MONETRA<b>.</b></span>
      <div>
        <h1 className={h1}>{t("download.title")}</h1>
        <p className={cx(muted, "mt-2")}>{t("download.intro")}</p>
      </div>

      {release ? (
        <div className="flex flex-col gap-2">
          <a className={buttonClass("primary", "lg", "w-full")} href={release.apkUrl}><Download />{t("download.button", { version: release.version, size: mb(release.sizeBytes) })}</a>
          <p className={cx("text-meta", muted)}>
            {t("download.released", { date: fullDate(new Date(release.publishedAt).toISOString().slice(0, 10), lang) })} <a href={release.pageUrl}>{t("download.notes")}</a>
          </p>
        </div>
      ) : (
        <Notice tone="info" role="status"><Rich text={t("download.none")} /></Notice>
      )}

      <section aria-labelledby="install" className="flex flex-col gap-3">
        <h2 id="install" className={h2}>{t("download.install")}</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li><Rich text={t("download.step1")} /></li>
          <li>{t("download.step2")}</li>
          <li><Rich text={t("download.step3")} /></li>
        </ol>
        <p className={cx("text-meta", muted)}>{t("download.updating")}</p>
      </section>

      <ul className="flex flex-col gap-3">
        <li className="flex gap-3"><WifiOff className="mt-0.5 shrink-0" /><span><Rich text={t("download.offline")} /></span></li>
        <li className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0" /><span><Rich text={t("download.sameAccount")} /></span></li>
        <li className="flex gap-3"><Smartphone className="mt-0.5 shrink-0" /><span><Rich text={t("download.androidVersion")} /></span></li>
      </ul>

      <p><Link href="/login">{t("download.useWeb")}</Link></p>
    </main>
  );
}
