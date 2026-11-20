"use client";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Page, PageHead, buttonClass, h1, iconButtonClass, spacer } from "@/components/ui";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import { useT } from "@/lib/i18n-client";
import { TransactionForm, type FormCategory, type FormInitial, type FormWallet } from "../transaction-form";

type Data = { timezone: string; now: { date: string; time: string }; wallets: FormWallet[]; categories: FormCategory[] };

/** Phone layout below the md breakpoint (900px, see globals.css). */
const PHONE = "(max-width: 899px)";
const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(PHONE);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};
/** Only ever rendered after a client navigation (a reload gets the full page), so the server value is never shown. */
const usePhone = () => useSyncExternalStore(subscribe, () => window.matchMedia(PHONE).matches, () => true);

/** Matches the sheet's slide-out, so it finishes before the route goes back. */
const CLOSE_MS = 200;

/**
 * Add transaction opened over the current screen. Phone: a bottom sheet over whatever was open.
 * Desktop: the same full-screen form as /transactions/new, laid over the main column so the sidebar stays usable.
 * Closing goes back in history, so the Android back button and the browser back both close it.
 */
export function AddTransactionSheet({ data, initial, empty }: { data: Data; initial: FormInitial | null; empty: ReactNode }) {
  const router = useRouter();
  const phone = usePhone();
  const { t } = useT();
  const [open, setOpen] = useState(true);

  function close(thenRefresh = false) {
    setOpen(false);
    setTimeout(() => {
      // Refresh the screen we return to (its Saldo just changed), not the sheet's route.
      if (thenRefresh) window.addEventListener("popstate", () => router.refresh(), { once: true });
      router.back();
    }, phone ? CLOSE_MS : 0);
  }

  const form = initial ? <TransactionForm mode="new" {...data} initial={initial} inSheet={phone} onSaved={() => close(true)} /> : empty;

  if (!phone) return <DesktopPanel onClose={() => close()}>{form}</DesktopPanel>;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && close()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[94dvh] gap-0 overflow-y-auto overscroll-contain rounded-t-2xl border-t-0 bg-paper p-0 text-base text-ink shadow-none"
      >
        <div className="sticky top-0 z-10 bg-paper">
          <span aria-hidden className="mx-auto mt-2 block h-1 w-10 rounded-full bg-line" />
          <div className="flex items-center gap-3 border-b border-line px-4 pt-1.5 pb-2.5">
            <SheetTitle className="text-xl font-bold text-ink">{t("nav.addTransaction")}</SheetTitle>
            <SheetDescription className="sr-only">{t("sheet.description")}</SheetDescription>
            <span className={spacer} />
            <button type="button" className={iconButtonClass()} aria-label={t("common.close")} onClick={() => close()}><X /></button>
          </div>
        </div>
        <div className="px-4 pt-5">{form}</div>
      </SheetContent>
    </Sheet>
  );
}

function DesktopPanel({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const { state } = useSidebar();
  const { t } = useT();
  const heading = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Runs once on open: moving focus again on every render would pull it out of the field being typed in.
  useEffect(() => {
    heading.current?.focus();
    // The screen underneath must not scroll while this one covers it.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-labelledby="add-h"
      className="fixed inset-y-0 right-0 z-30 overflow-y-auto overscroll-contain bg-background transition-[left] duration-200 ease-linear"
      style={{ left: state === "expanded" ? "var(--sidebar-width)" : "var(--sidebar-width-icon)" }}
    >
      <PageHead>
        <h1 id="add-h" ref={heading} tabIndex={-1} className={h1}>{t("nav.addTransaction")}</h1>
        <span className={spacer} />
        <button type="button" className={buttonClass("quiet")} onClick={onClose}>{t("common.cancel")}</button>
      </PageHead>
      <Page>{children}</Page>
    </div>
  );
}
