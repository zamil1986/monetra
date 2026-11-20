"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Plus, ReceiptText, Settings, Tags, Wallet, WifiOff } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n-client";
import { useOnline } from "@/lib/use-online";
import { Rich } from "./rich";
import { SignOutButton } from "./sign-out-button";
import { Tabbar } from "./tabbar";
import { buttonClass, cx } from "./ui";

/** Only screens that exist are linked; Reports and Budgets arrive with their features. */
const NAV = [
  { href: "/dashboard", label: "nav.dashboard", Icon: House },
  { href: "/transactions", label: "nav.transactions", Icon: ReceiptText },
  { href: "/wallets", label: "nav.wallets", Icon: Wallet },
  { href: "/categories", label: "nav.categories", Icon: Tags },
  { href: "/settings", label: "nav.settings", Icon: Settings },
] as const;

/** Sign-in screens draw their own full-page layout, without the rail and tab bar. */
export const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/download"];

const wordmark = "fig block font-black leading-none text-white no-underline [&_b]:font-black [&_b]:text-yellow";

/** Hidden when the desktop sidebar is collapsed to its icon rail (Cmd/Ctrl+B or the rail edge). */
const hideInRail = "group-data-[collapsible=icon]:hidden";

export function AppShell({
  user,
  defaultOpen = true,
  modal,
  children,
}: {
  /** `demo` is how long an Akun demo has left ("expires in 23h"), shown instead of its throwaway email. */
  user: { name: string; email: string; demo: string | null } | null;
  defaultOpen?: boolean;
  /** The @modal slot: Add transaction opened over the current screen. */
  modal?: ReactNode;
  children: ReactNode;
}) {
  const path = usePathname();
  const online = useOnline();
  const { t } = useT();
  const current = (href: string) =>
    path === href || (href === "/transactions" && path.startsWith("/transactions/") && path !== "/transactions/new") ? "page" : undefined;
  const initials = user?.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("") ?? "?";
  const adding = path === "/transactions/new";
  if (AUTH_PATHS.includes(path)) return <TooltipProvider delayDuration={300}>{children}</TooltipProvider>;

  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider defaultOpen={defaultOpen} style={{ "--sidebar-width": "232px", "--sidebar-width-icon": "64px" } as CSSProperties}>
        {/* Desktop: cobalt rail on the left (the phone uses the top band and bottom tab bar instead) */}
        <Sidebar collapsible="icon" className="border-r-0 [&_:focus-visible]:outline-yellow">
          <SidebarHeader className="px-3.5 pt-[22px] pb-[22px] group-data-[collapsible=icon]:px-2">
            <Link className={cx(wordmark, "px-2.5 text-[28px] group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:text-center")} href="/dashboard" aria-label={t("nav.homeLink")}>
              <span className={hideInRail}>MONETRA</span>
              <span className="hidden group-data-[collapsible=icon]:inline">M</span>
              <b>.</b>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-3.5 group-data-[collapsible=icon]:px-2">
            <nav aria-label={t("nav.main")}>
              <SidebarMenu className="gap-0.5">
                {NAV.map(({ href, label, Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={current(href) === "page"}
                      tooltip={t(label)}
                      className={cx(
                        "h-auto gap-3 rounded px-2.5 py-[9px] text-base font-medium text-on-cobalt no-underline duration-150 ease-out-expo [&_svg]:size-[18px]",
                        "hover:bg-cobalt-deep hover:text-white active:bg-cobalt-deep active:text-white",
                        "data-active:bg-white data-active:font-bold data-active:text-cobalt",
                        "group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!",
                      )}
                    >
                      <Link href={href} aria-current={current(href)}>
                        <Icon />
                        <span className={hideInRail}>{t(label)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>

            <Link
              className={buttonClass(
                "yellow",
                "md",
                "mt-4 aria-[current=page]:outline-2 aria-[current=page]:outline-yellow group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:p-0",
              )}
              href="/transactions/new"
              aria-current={adding ? "page" : undefined}
              aria-label={t("nav.addTransaction")}
            >
              <Plus />
              <span className={hideInRail}>{t("nav.addTransaction")}</span>
            </Link>
          </SidebarContent>

          {user && (
            <SidebarFooter className={cx("mx-3.5 mb-4 min-w-0 border-t border-cobalt-line px-2.5 pt-3.5 text-meta text-on-cobalt", hideInRail)}>
              <div className="min-w-0">
                <strong className="block truncate text-sm font-semibold text-white">{user.name}</strong>
                {user.demo ? (
                  <>
                    <span className="block">{t("shell.demoAccount")}</span>
                    <span className="block first-letter:uppercase">{user.demo}</span>
                  </>
                ) : (
                  <span className="block truncate" title={user.email}>{user.email}</span>
                )}
              </div>
              <SignOutButton className="mt-2 text-on-cobalt underline hover:text-white" />
            </SidebarFooter>
          )}
          <SidebarRail className="hover:after:bg-cobalt-line" />
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col bg-background max-md:pb-[calc(84px+env(safe-area-inset-bottom))]">
          {/* Phone: cobalt band on top */}
          {/* Installed on iPhone the status bar is translucent, so the band grows under it by the notch height. */}
          <header className="sticky top-0 z-20 flex h-[calc(52px+env(safe-area-inset-top))] items-center justify-between bg-cobalt px-4 pt-[env(safe-area-inset-top)] text-white md:hidden [&_:focus-visible]:outline-yellow">
            <Link className={cx(wordmark, "text-2xl")} href="/dashboard" aria-label={t("nav.homeLink")}>MONETRA<b>.</b></Link>
            <Link
              className="inline-grid size-10 place-items-center rounded-full no-underline"
              href="/settings"
              aria-label={t("nav.settings")}
              aria-current={current("/settings")}
            >
              <span className="inline-grid size-8 place-items-center rounded-full bg-white text-meta font-bold text-cobalt" aria-hidden>{initials}</span>
            </Link>
          </header>
          {!online && (
            <div className="flex items-center gap-2.5 bg-ink px-4 py-2 text-sm text-paper md:px-8" role="status">
              <WifiOff /><span><Rich text={t("shell.offline")} /></span>
            </div>
          )}
          {children}
          {modal}
        </div>

        {/* Phone: tab bar at the bottom */}
        <Tabbar
          aria-label={t("nav.main")}
          badgeSuffix={t("nav.badgeNew")}
          items={[
            { href: "/dashboard", label: t("nav.home"), Icon: House, active: !!current("/dashboard") },
            { href: "/transactions", label: t("nav.transactions"), Icon: ReceiptText, active: !!current("/transactions") },
            { href: "/transactions/new", label: t("nav.add"), Icon: Plus, primary: true, ariaLabel: t("nav.addTransaction") },
            // Wallets holds this slot until Reports exists; then it moves into Settings (PRD 4.3).
            { href: "/wallets", label: t("nav.wallets"), Icon: Wallet, active: !!current("/wallets") },
            { href: "/settings", label: t("nav.settings"), Icon: Settings, active: !!current("/settings") },
          ]}
        />
      </SidebarProvider>
    </TooltipProvider>
  );
}
