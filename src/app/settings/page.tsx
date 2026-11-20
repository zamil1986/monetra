import { ChevronRight, Smartphone, Tags, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { LanguageSwitch } from "@/components/language-switch";
import { NotSignedIn } from "@/components/not-signed-in";
import { SignOutButton } from "@/components/sign-out-button";
import { Page, PageHead, buttonClass, cx, h1, h2, rowClass, rowSub, rowTitle, rowsClass } from "@/components/ui";
import type { MessageKey } from "@/domain/i18n";
import { demoTimeLeft } from "@/domain/presentation";
import { getT, titled } from "@/server/i18n";
import { currentUser } from "@/server/page-session";

export const generateMetadata = titled("settings.title");
export const dynamic = "force-dynamic";

const LINKS: { href: string; label: MessageKey; sub: MessageKey; Icon: LucideIcon }[] = [
  { href: "/wallets", label: "nav.wallets", sub: "settings.walletsSub", Icon: Wallet },
  { href: "/categories", label: "nav.categories", sub: "settings.categoriesSub", Icon: Tags },
  { href: "/download", label: "settings.android", sub: "settings.androidSub", Icon: Smartphone },
];

/**
 * The phone's way to everything outside the tab bar, the Bahasa, and the place to sign out.
 * Profile, time zone and password stay read-only until the full Settings screen (PRD 4.3).
 */
export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) return <NotSignedIn />;
  const { t } = await getT();
  const demo = user.isDemo && user.demoExpiresAt ? demoTimeLeft(user.demoExpiresAt, new Date(), t) : null;

  return (
    <>
      <PageHead><h1 className={h1}>{t("settings.title")}</h1></PageHead>
      <Page>
        <div className="flex max-w-[640px] flex-col gap-10">
          <section aria-labelledby="account">
            <h2 id="account" className={h2}>{t("settings.account")}</h2>
            <dl className={cx(rowsClass, "mt-3")}>
              <div className={rowClass}><dt className="w-24 shrink-0 text-meta text-ink-2">{t("common.name")}</dt><dd className="min-w-0 truncate font-semibold">{user.name}</dd></div>
              <div className={rowClass}>
                <dt className="w-24 shrink-0 text-meta text-ink-2">{demo ? t("settings.account") : t("common.email")}</dt>
                <dd className="min-w-0 truncate font-semibold">{demo ? t("settings.demoAccount", { left: demo }) : user.email}</dd>
              </div>
              <div className={rowClass}><dt className="w-24 shrink-0 text-meta text-ink-2">{t("settings.timezone")}</dt><dd className="min-w-0 truncate font-semibold">{user.timezone}</dd></div>
            </dl>
            {demo && <p className="mt-2 text-meta text-ink-2">{t("settings.demoNote")}</p>}
          </section>

          <section aria-labelledby="language">
            <h2 id="language" className={h2}>{t("lang.label")}</h2>
            <p className="mt-1 mb-3 text-meta text-ink-2">{t("settings.languageSub")}</p>
            <LanguageSwitch saveToAccount className="max-w-[400px]" />
          </section>

          <section aria-labelledby="manage">
            <h2 id="manage" className={h2}>{t("settings.manage")}</h2>
            <nav aria-label={t("settings.manage")} className={cx(rowsClass, "mt-3")}>
              {LINKS.map(({ href, label, sub, Icon }) => (
                <Link key={href} href={href} className={cx(rowClass, "min-h-14 text-inherit no-underline hover:bg-panel")}>
                  <Icon className="text-ink-2" aria-hidden />
                  <span className="min-w-0 flex-1"><span className={rowTitle}>{t(label)}</span><span className={rowSub}>{t(sub)}</span></span>
                  <ChevronRight className="text-ink-3" aria-hidden />
                </Link>
              ))}
            </nav>
          </section>

          <SignOutButton className={buttonClass("danger", "lg", "w-full md:w-auto md:self-start")} />
        </div>
      </Page>
    </>
  );
}
