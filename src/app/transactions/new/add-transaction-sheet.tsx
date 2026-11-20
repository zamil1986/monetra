"use client";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { iconButtonClass, spacer } from "@/components/ui";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
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

/** Matches the slide-out and fade-out below, so they finish before the route goes back. */
const CLOSE_MS = 200;

/**
 * Add transaction opened over the current screen. Phone: a bottom sheet. Desktop: a centered dialog.
 * Both are modal, so the screen underneath is inert while one is open; Escape, the close button and Cancel close it.
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
    }, CLOSE_MS);
  }

  const closeButton = <button type="button" className={iconButtonClass()} aria-label={t("common.close")} onClick={() => close()}><X /></button>;

  if (!phone) {
    const form = initial ? (
      <TransactionForm mode="new" {...data} initial={initial} inDialog onSaved={() => close(true)} onCancel={() => close()} />
    ) : empty;

    return (
      <Dialog.Root open={open} onOpenChange={(next) => !next && close()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/45 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Content
            className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(92dvh,900px)] w-[min(960px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 flex-col border-t-2 border-ink bg-paper text-base text-ink shadow-[0_24px_64px_-16px_rgba(20,22,26,0.45)] outline-0 duration-200 ease-out-expo data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98]"
            // Typed figures must survive a stray click: only Escape, the close button and Cancel dismiss it.
            onInteractOutside={(e) => e.preventDefault()}
            // Recording starts with the amount, so that is where the caret goes.
            onOpenAutoFocus={(e) => {
              const amount = document.getElementById("amt");
              if (amount) {
                e.preventDefault();
                amount.focus();
              }
            }}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-line px-8 py-3.5">
              <Dialog.Title className="text-2xl leading-tight font-bold text-ink">{t("nav.addTransaction")}</Dialog.Title>
              <Dialog.Description className="sr-only">{t("sheet.description")}</Dialog.Description>
              <span className={spacer} />
              {closeButton}
            </div>
            <div className="overflow-y-auto overscroll-contain px-8 pt-6">{form}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  const form = initial ? <TransactionForm mode="new" {...data} initial={initial} inSheet onSaved={() => close(true)} /> : empty;

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
            {closeButton}
          </div>
        </div>
        <div className="px-4 pt-5">{form}</div>
      </SheetContent>
    </Sheet>
  );
}
