"use client";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useSyncExternalStore, type ReactNode } from "react";
import { iconButtonClass, spacer } from "@/components/ui";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useT } from "@/lib/i18n-client";

/** Phone layout below the md breakpoint (900px, see globals.css). */
const PHONE = "(max-width: 899px)";
const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(PHONE);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};
const usePhone = () => useSyncExternalStore(subscribe, () => window.matchMedia(PHONE).matches, () => false);

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The field the caret (and on a phone, the keyboard) goes to on open. */
  initialFocusId?: string;
  children: ReactNode;
};

/**
 * A small form (a Dompet, a Kategori) opened over its list. Phone: a bottom sheet. Desktop: a centered dialog,
 * drawn like Add transaction. Typed values must survive a stray click: only Escape, the close button and Cancel close it.
 */
export function FormDialog({ open, onClose, title, initialFocusId, children }: Props) {
  const phone = usePhone();
  const { t } = useT();

  function focusInitial(e: Event) {
    const field = initialFocusId && document.getElementById(initialFocusId);
    if (field) {
      e.preventDefault();
      field.focus();
    }
  }

  const closeButton = <button type="button" className={iconButtonClass()} aria-label={t("common.close")} onClick={onClose}><X /></button>;
  const onOpenChange = (next: boolean) => !next && onClose();
  const keepOnOutside = (e: Event) => e.preventDefault();

  if (!phone) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim/45 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(92dvh,820px)] w-[min(480px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 flex-col border-t-2 border-ink bg-paper text-base ring-1 ring-line text-ink shadow-[0_24px_64px_-16px_rgba(20,22,26,0.45)] outline-0 duration-200 ease-out-expo data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98]"
            onInteractOutside={keepOnOutside}
            onOpenAutoFocus={focusInitial}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-line px-6 py-3.5">
              <Dialog.Title className="min-w-0 truncate text-xl leading-tight font-bold text-ink">{title}</Dialog.Title>
              <span className={spacer} />
              {closeButton}
            </div>
            <div className="overflow-y-auto overscroll-contain px-6 pt-5 pb-6">{children}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        onInteractOutside={keepOnOutside}
        onOpenAutoFocus={focusInitial}
        className="max-h-[94dvh] gap-0 overflow-y-auto overscroll-contain rounded-t-2xl border-t-0 bg-paper p-0 ring-1 ring-line text-base text-ink shadow-none"
      >
        <div className="sticky top-0 z-10 bg-paper">
          <span aria-hidden className="mx-auto mt-2 block h-1 w-10 rounded-full bg-line" />
          <div className="flex items-center gap-3 border-b border-line px-4 pt-1.5 pb-2.5">
            <SheetTitle className="min-w-0 truncate text-xl font-bold text-ink">{title}</SheetTitle>
            <span className={spacer} />
            {closeButton}
          </div>
        </div>
        <div className="px-4 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
