"use client";
import { useId, useRef, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n-client";
import { useOnline } from "@/lib/use-online";
import { Button, FieldError, cx } from "./ui";

type Props = {
  /** The control that asks; it gets the function that opens the confirmation. */
  trigger: (open: () => void) => ReactNode;
  title: string;
  body: string;
  /** What is about to go, so the person sees it before it goes. */
  item: { title: string; meta?: string; aside?: ReactNode };
  confirmLabel: string;
  /** Does the deleting. Resolves to an error message to show, or null when it is done. */
  onConfirm: () => Promise<string | null>;
};

/**
 * Deleting always asks first (PRD 3.4 rule 10), for a Transaksi, a Dompet or a Kategori alike.
 * Drawn like the Add dialog: square, a 2px ink top rule, the item named in figures.
 */
export function ConfirmDelete({ trigger, title, body, item, confirmLabel, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const online = useOnline();
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();

  async function confirm() {
    setBusy(true);
    setError(null);
    const problem = await onConfirm();
    setBusy(false);
    if (problem) setError(problem);
    else dialog.current?.close();
  }

  return (
    <>
      {trigger(() => { setError(null); dialog.current?.showModal(); })}
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-h`}
        aria-describedby={`${id}-b`}
        className={cx(
          "w-[min(440px,calc(100vw-32px))] border-0 border-t-2 border-ink bg-paper p-6 text-left text-ink whitespace-normal ring-1 ring-line shadow-[0_24px_64px_-16px_rgba(20,22,26,0.45)] backdrop:bg-scrim/45",
          "m-auto max-md:mb-0 max-md:w-full max-md:max-w-full max-md:px-4 max-md:pt-[22px] max-md:pb-[calc(18px+env(safe-area-inset-bottom))]",
        )}
      >
        <h2 id={`${id}-h`} className="mb-2 text-xl font-bold">{title}</h2>
        <p id={`${id}-b`} className="text-ink-2">{body}</p>
        <div className="mt-3.5 flex items-center justify-between gap-3 border-y border-line py-2.5 text-sm">
          <span className="min-w-0"><strong className="block truncate">{item.title}</strong>{item.meta && <span className="text-meta text-ink-2">{item.meta}</span>}</span>
          {item.aside && <span className="fig shrink-0 text-xl">{item.aside}</span>}
        </div>
        {error && <div className="mt-3"><FieldError message={error} /></div>}
        <div className="mt-[22px] flex justify-end gap-2.5 max-md:flex-col-reverse max-md:[&_button]:min-h-12">
          <Button variant="secondary" onClick={() => dialog.current?.close()}>{t("del.keep")}</Button>
          <Button variant="dangerSolid" disabled={busy || !online} onClick={confirm}>{online ? confirmLabel : t("del.needsConnection")}</Button>
        </div>
      </dialog>
    </>
  );
}
