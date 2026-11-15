"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Plus, ReceiptText, Wallet, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { useOnline } from "@/lib/use-online";
import { buttonClass, cx } from "./ui";

/** Only screens that exist are linked; Dashboard, Reports and the rest arrive with their features. */
const NAV = [
  { href: "/transactions", label: "Transactions", Icon: ReceiptText },
  { href: "/wallets", label: "Wallets", Icon: Wallet },
];

const wordmark = "fig block font-black leading-none text-white no-underline [&_b]:font-black [&_b]:text-yellow";

export function AppShell({ user, children }: { user: { name: string; email: string } | null; children: ReactNode }) {
  const path = usePathname();
  const online = useOnline();
  const current = (href: string) =>
    path === href || (href === "/transactions" && path.startsWith("/transactions/") && path !== "/transactions/new") ? "page" : undefined;
  const initials = user?.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("") ?? "?";

  return (
    <>
      {/* Desktop: cobalt rail on the left */}
      <aside className="fixed inset-y-0 left-0 hidden w-[232px] flex-col gap-0.5 overflow-y-auto bg-cobalt px-3.5 pt-[22px] pb-4 text-white md:flex [&_:focus-visible]:outline-yellow">
        <Link className={cx(wordmark, "px-2.5 pb-[22px] text-[28px]")} href="/transactions" aria-label="Monetra home">MONETRA<b>.</b></Link>
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={current(href)}
              className={cx(
                "flex items-center gap-3 rounded px-2.5 py-[9px] font-medium text-on-cobalt no-underline transition-colors duration-150 ease-out-expo",
                "hover:bg-cobalt-deep hover:text-white aria-[current=page]:bg-white aria-[current=page]:font-bold aria-[current=page]:text-cobalt",
              )}
            >
              <Icon />{label}
            </Link>
          ))}
        </nav>
        <Link
          className={buttonClass("yellow", "md", "mt-4 aria-[current=page]:outline-2 aria-[current=page]:outline-yellow")}
          href="/transactions/new"
          aria-current={path === "/transactions/new" ? "page" : undefined}
        >
          <Plus />Add transaction
        </Link>
        {user && (
          <div className="mt-auto border-t border-cobalt-line px-2.5 pt-3.5 text-meta text-on-cobalt">
            <strong className="block text-sm font-semibold text-white">{user.name}</strong>{user.email}
          </div>
        )}
      </aside>

      <div className="min-w-0 max-md:pb-[84px] md:ml-[232px]">
        {/* Phone: cobalt band on top */}
        <header className="sticky top-0 z-20 flex h-[52px] items-center justify-between bg-cobalt px-4 text-white md:hidden [&_:focus-visible]:outline-yellow">
          <Link className={cx(wordmark, "text-2xl")} href="/transactions" aria-label="Monetra home">MONETRA<b>.</b></Link>
          <span className="inline-grid size-8 place-items-center rounded-full bg-white text-meta font-bold text-cobalt" aria-label={user?.name}>{initials}</span>
        </header>
        {!online && (
          <div className="flex items-center gap-2.5 bg-ink px-4 py-2 text-sm text-white md:px-8" role="status">
            <WifiOff /><span><strong>You&apos;re offline.</strong> Showing what was loaded. Recording needs a connection.</span>
          </div>
        )}
        {children}
      </div>

      {/* Phone: tab bar at the bottom */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t-2 border-ink bg-paper px-1 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] md:hidden"
      >
        {[
          { href: "/wallets", label: "Wallets", Icon: House },
          { href: "/transactions/new", label: "Add", Icon: Plus, add: true },
          { href: "/transactions", label: "Transactions", Icon: ReceiptText },
        ].map(({ href, label, Icon, add }) => (
          <Link
            key={href}
            href={href}
            aria-label={add ? "Add transaction" : undefined}
            aria-current={add ? undefined : current(href)}
            className={cx(
              "flex min-h-12 flex-col items-center gap-0.5 rounded py-[5px] text-[11.5px] font-semibold no-underline [&_svg]:size-[22px]!",
              add ? "text-ink" : "text-ink-2 aria-[current=page]:text-cobalt",
            )}
          >
            {add ? (
              <span className="-mt-[18px] grid h-11 w-[52px] place-items-center rounded-md border-2 border-ink bg-yellow"><Icon /></span>
            ) : (
              <Icon />
            )}
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
