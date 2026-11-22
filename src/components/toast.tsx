"use client";
import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n-client";

type Toast = {
  /** First line: what happened, e.g. "Saved expense of Rp 12.000." */
  message: string;
  /** Second line in figures: where the money now stands, e.g. "Tunai · Rp 159.000". */
  detail?: string;
  /** One reversing action, e.g. Undo. Runs once; the toast then shows what the action returns. */
  action?: { label: string; run: () => Promise<string> };
  /** A Transaksi id to mark on the list it lands in (rows carry `data-tx`). */
  fresh?: string;
};

type Shown = Toast & { key: number };

const ToastContext = createContext<(toast: Toast) => void>(() => {});

/** Says how a recording went once its form is gone: the end of the job, not a silent close. */
export const useToast = () => useContext(ToastContext);

const SHOW_MS = 6000;
const FRESH_MS = 2400;

/**
 * Holds the one toast on screen. It lives in the app shell, above the `@modal` slot, so it outlives the
 * Add sheet or dialog that raised it and the `router.refresh()` that follows.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Shown | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((next: Toast) => {
    clearTimeout(timer.current);
    setToast({ ...next, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), SHOW_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  // The new row arrives with the refresh after the toast, so look for it for a little while.
  const fresh = toast?.fresh;
  useEffect(() => {
    if (!fresh) return;
    let frame = 0;
    const started = performance.now();
    const marked: Element[] = [];
    const look = () => {
      const rows = document.querySelectorAll(`[data-tx="${CSS.escape(fresh)}"]`);
      if (rows.length) {
        rows.forEach((row) => { row.setAttribute("data-fresh", ""); marked.push(row); });
        return;
      }
      if (performance.now() - started < 3000) frame = requestAnimationFrame(look);
    };
    frame = requestAnimationFrame(look);
    const unmark = setTimeout(() => marked.forEach((row) => row.removeAttribute("data-fresh")), FRESH_MS + 3000);
    return () => { cancelAnimationFrame(frame); clearTimeout(unmark); marked.forEach((row) => row.removeAttribute("data-fresh")); };
  }, [fresh, toast?.key]);

  async function runAction() {
    if (!toast?.action || busy) return;
    setBusy(true);
    clearTimeout(timer.current);
    const message = await toast.action.run();
    setBusy(false);
    show({ message });
  }

  return (
    <ToastContext.Provider value={show}>
      {children}
      <ToastView toast={toast} busy={busy} onAction={runAction} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastView({ toast, busy, onAction, onDismiss }: { toast: Shown | null; busy: boolean; onAction: () => void; onDismiss: () => void }) {
  const { t } = useT();
  return (
    // Always in the tree, so screen readers hear each new message in the live region.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] flex justify-center md:inset-x-auto md:right-8 md:bottom-8"
    >
      {toast && (
        <div
          key={toast.key}
          className="pointer-events-auto flex w-full max-w-[440px] animate-rise items-center gap-3 border-t-2 border-yellow bg-ink py-3 pr-2 pl-4 text-paper motion-reduce:animate-none md:w-[400px]"
        >
          <p className="min-w-0 flex-1">
            <span className="block font-semibold">{capitalize(toast.message)}</span>
            {toast.detail && <span className="fig block text-[17px] leading-snug">{toast.detail}</span>}
          </p>
          {toast.action && (
            <button
              type="button"
              disabled={busy}
              onClick={onAction}
              className="min-h-11 shrink-0 px-3 font-bold text-paper underline decoration-2 underline-offset-4 hover:decoration-yellow focus-visible:outline-2 focus-visible:outline-yellow disabled:opacity-60"
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            aria-label={t("toast.dismiss")}
            onClick={onDismiss}
            className="grid size-11 shrink-0 place-items-center text-paper/80 hover:text-paper focus-visible:outline-2 focus-visible:outline-yellow [&_svg]:size-[18px]"
          >
            <X />
          </button>
        </div>
      )}
    </div>
  );
}

/** Catalog texts like "{type} sebesar {amount} tersimpan." start with a lowercase type word. */
const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);
