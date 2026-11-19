"use client";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, FieldError, cx, iconButtonClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { useOnline } from "@/lib/use-online";

type Props = { id: string; title: string; meta: string; amount: string; variant?: "icon" | "button"; after?: string };

/** PRD 3.4 rule 10: deleting always goes through a confirmation dialog. */
export function DeleteTransactionButton({ id, title, meta, amount, variant = "icon", after }: Props) {
  const router = useRouter();
  const online = useOnline();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      try {
        await api(`/api/transactions/${id}`, { method: "DELETE" });
      } catch (e) {
        // A repeat of a delete that already went through: it's gone, which is what was asked.
        if (!(e instanceof ApiError && e.status === 404)) throw e;
      }
      haptic();
      dialog.current?.close();
      if (after) router.push(after);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <>
          <Link className={iconButtonClass()} href={`/transactions/${id}`} aria-label={`Edit ${title}`}><Pencil /></Link>
          <button className={iconButtonClass(true)} type="button" aria-label={`Delete ${title}`} onClick={() => dialog.current?.showModal()}><Trash2 /></button>
        </>
      ) : (
        <Button variant="danger" onClick={() => dialog.current?.showModal()}><Trash2 />Delete</Button>
      )}
      <dialog
        ref={dialog}
        aria-labelledby={`del-h-${id}`}
        className={cx(
          "w-[min(440px,calc(100vw-32px))] rounded-xl border-0 bg-white p-6 text-left text-ink whitespace-normal shadow-[0_18px_48px_-12px_rgb(20_22_26/0.45)]",
          "m-auto max-md:mb-0 max-md:w-full max-md:max-w-full max-md:rounded-t-[10px] max-md:rounded-b-none max-md:px-4 max-md:pt-[22px] max-md:pb-[calc(18px+env(safe-area-inset-bottom))]",
        )}
      >
        <h2 id={`del-h-${id}`} className="mb-2 text-xl font-bold">Delete this transaction?</h2>
        <p className="text-ink-2">It disappears from every list, balance and report. This can&apos;t be undone.</p>
        <div className="mt-3.5 flex items-center justify-between gap-3 rounded bg-panel px-3 py-2.5 text-sm">
          <span><strong>{title}</strong><br /><span className="text-meta text-ink-2">{meta}</span></span>
          <span className="fig text-xl">{amount}</span>
        </div>
        {error && <div className="mt-3"><FieldError message={error} /></div>}
        <div className="mt-[22px] flex justify-end gap-2.5 max-md:flex-col-reverse max-md:[&_button]:min-h-12">
          <Button variant="secondary" onClick={() => dialog.current?.close()}>Keep it</Button>
          <Button variant="dangerSolid" disabled={busy || !online} onClick={confirm}>{online ? "Delete transaction" : "Deleting needs a connection"}</Button>
        </div>
      </dialog>
    </>
  );
}
