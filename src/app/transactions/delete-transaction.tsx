"use client";
import { CircleAlert, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useOnline } from "@/lib/use-online";

type Props = { id: string; title: string; meta: string; amount: string; variant?: "icon" | "button"; after?: string };

/** PRD 3.4 rule 10: deleting always goes through a confirmation dialog. */
export function DeleteTransactionButton({ id, title, meta, amount, variant = "icon", after }: Props) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const online = useOnline();

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/transactions/${id}`, { method: "DELETE" });
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
          <Link className="icon-btn" href={`/transactions/${id}`} aria-label={`Edit ${title}`}><Pencil /></Link>
          <button className="icon-btn danger" type="button" aria-label={`Delete ${title}`} onClick={() => dialog.current?.showModal()}><Trash2 /></button>
        </>
      ) : (
        <button className="btn danger" type="button" onClick={() => dialog.current?.showModal()}><Trash2 />Delete</button>
      )}
      <dialog ref={dialog} aria-labelledby={`del-h-${id}`}>
        <h2 id={`del-h-${id}`}>Delete this transaction?</h2>
        <p className="muted">It disappears from every list, balance and report. This can&apos;t be undone.</p>
        <div className="summary">
          <span><strong>{title}</strong><br /><span className="small muted">{meta}</span></span>
          <span className="fig" style={{ fontSize: 20 }}>{amount}</span>
        </div>
        {error && <p className="error" role="alert"><CircleAlert />{error}</p>}
        <div className="dialog-actions">
          <button className="btn secondary" type="button" onClick={() => dialog.current?.close()}>Keep it</button>
          <button className="btn danger solid" type="button" disabled={busy || !online} onClick={confirm}>{online ? "Delete transaction" : "Deleting needs a connection"}</button>
        </div>
      </dialog>
    </>
  );
}
