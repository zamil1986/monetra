import { ChevronRight, Smartphone, Tags, Wallet, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NotSignedIn } from "@/components/not-signed-in";
import { SignOutButton } from "@/components/sign-out-button";
import { Page, PageHead, buttonClass, cx, h1, h2, rowClass, rowSub, rowTitle, rowsClass } from "@/components/ui";
import { demoTimeLeft } from "@/domain/presentation";
import { currentUser } from "@/server/page-session";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const LINKS: { href: string; label: string; sub: string; Icon: LucideIcon }[] = [
  { href: "/wallets", label: "Wallets", sub: "Cash, bank accounts and e-wallets", Icon: Wallet },
  { href: "/categories", label: "Categories", sub: "Where income comes from and spending goes", Icon: Tags },
  { href: "/download", label: "Android app", sub: "Record offline on your phone", Icon: Smartphone },
];

/**
 * The phone's way to everything outside the tab bar, and the place to sign out.
 * Read-only for now: changing the profile, time zone and password arrives with the full Settings screen (PRD 4.3).
 */
export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) return <NotSignedIn />;
  const demo = user.isDemo && user.demoExpiresAt ? demoTimeLeft(user.demoExpiresAt) : null;

  return (
    <>
      <PageHead><h1 className={h1}>Settings</h1></PageHead>
      <Page>
        <div className="flex max-w-[640px] flex-col gap-10">
          <section aria-labelledby="account">
            <h2 id="account" className={h2}>Account</h2>
            <dl className={cx(rowsClass, "mt-3")}>
              <div className={rowClass}><dt className="w-24 shrink-0 text-meta text-ink-2">Name</dt><dd className="min-w-0 truncate font-semibold">{user.name}</dd></div>
              <div className={rowClass}>
                <dt className="w-24 shrink-0 text-meta text-ink-2">{demo ? "Account" : "Email"}</dt>
                <dd className="min-w-0 truncate font-semibold">{demo ? `Demo account · ${demo}` : user.email}</dd>
              </div>
              <div className={rowClass}><dt className="w-24 shrink-0 text-meta text-ink-2">Time zone</dt><dd className="min-w-0 truncate font-semibold">{user.timezone}</dd></div>
            </dl>
            {demo && <p className="mt-2 text-meta text-ink-2">A demo account and everything in it is deleted after 24 hours.</p>}
          </section>

          <section aria-labelledby="manage">
            <h2 id="manage" className={h2}>Manage</h2>
            <nav aria-label="Manage" className={cx(rowsClass, "mt-3")}>
              {LINKS.map(({ href, label, sub, Icon }) => (
                <Link key={href} href={href} className={cx(rowClass, "min-h-14 text-inherit no-underline hover:bg-panel")}>
                  <Icon className="text-ink-2" aria-hidden />
                  <span className="min-w-0 flex-1"><span className={rowTitle}>{label}</span><span className={rowSub}>{sub}</span></span>
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
