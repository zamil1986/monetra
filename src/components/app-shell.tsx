"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Plus, ReceiptText, Wallet, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { useOnline } from "@/lib/use-online";

/** Only screens that exist are linked; Dashboard, Reports and the rest arrive with their features. */
const NAV = [
  { href: "/transactions", label: "Transactions", Icon: ReceiptText },
  { href: "/wallets", label: "Wallets", Icon: Wallet },
];

export function AppShell({ user, children }: { user: { name: string; email: string } | null; children: ReactNode }) {
  const path = usePathname();
  const online = useOnline();
  const current = (href: string) => (path === href || (href === "/transactions" && path.startsWith("/transactions/") && path !== "/transactions/new") ? "page" : undefined);
  const initials = user?.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("") ?? "?";

  return (
    <>
      <aside className="rail">
        <Link className="wordmark" href="/transactions" aria-label="Monetra home">MONETRA<b>.</b></Link>
        <nav aria-label="Main">
          {NAV.map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={current(href)}><Icon />{label}</Link>
          ))}
        </nav>
        <Link className="btn btn-add" href="/transactions/new" aria-current={path === "/transactions/new" ? "page" : undefined}><Plus />Add transaction</Link>
        {user && <div className="rail-user"><strong>{user.name}</strong>{user.email}</div>}
      </aside>
      <div className="main">
        <header className="band">
          <Link className="wordmark" href="/transactions" aria-label="Monetra home">MONETRA<b>.</b></Link>
          <span className="who" aria-label={user?.name}>{initials}</span>
        </header>
        {!online && (
          <div className="offline-bar" role="status"><WifiOff /><span><strong>You&apos;re offline.</strong> Showing what was loaded. Recording needs a connection.</span></div>
        )}
        {children}
      </div>
      <nav className="tabbar" aria-label="Main">
        <Link href="/wallets" aria-current={current("/wallets")}><House />Wallets</Link>
        <Link className="add" href="/transactions/new" aria-label="Add transaction"><span className="sq"><Plus /></span>Add</Link>
        <Link href="/transactions" aria-current={current("/transactions")}><ReceiptText />Transactions</Link>
      </nav>
    </>
  );
}
