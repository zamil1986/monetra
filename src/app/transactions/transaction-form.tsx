"use client";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, CircleAlert, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { categoryIcon } from "@/components/icons";
import { localToInstant } from "@/domain/local-time";
import { formatRupiah, parseRupiah } from "@/domain/money";
import type { TransactionType } from "@/domain/types";
import { api, ApiError } from "@/lib/api";
import { useOnline } from "@/lib/use-online";

export type FormWallet = { id: string; name: string; balance: number; archived: boolean };
export type FormCategory = { id: string; name: string; type: "INCOME" | "EXPENSE"; icon: string; archived: boolean };
export type FormInitial = {
  id: string;
  type: TransactionType;
  amount: number;
  walletId: string;
  toWalletId: string | null;
  categoryId: string | null;
  description: string | null;
  date: string;
  time: string;
};

type Props = {
  mode: "new" | "edit";
  timezone: string;
  now: { date: string; time: string };
  wallets: FormWallet[];
  categories: FormCategory[];
  totalBalance: number;
  initial: FormInitial;
};

const TYPES = [
  { value: "EXPENSE", label: "Expense", Icon: ArrowUpRight },
  { value: "INCOME", label: "Income", Icon: ArrowDownLeft },
  { value: "TRANSFER", label: "Transfer", Icon: ArrowLeftRight },
] as const;

const newId = () => crypto.randomUUID();
const typeWord = (t: TransactionType) => t.toLowerCase();

export function TransactionForm({ mode, timezone, now, wallets, categories, totalBalance, initial }: Props) {
  const router = useRouter();
  const online = useOnline();
  // The ID is made here, before sending, so a retried save can't create a duplicate (ADR 0003).
  const [id, setId] = useState(mode === "new" ? newId : () => initial.id);
  const [type, setType] = useState<TransactionType>(initial.type);
  const [amount, setAmount] = useState(initial.amount ? initial.amount.toLocaleString("id-ID") : "");
  const [walletId, setWalletId] = useState(initial.walletId);
  const [toWalletId, setToWalletId] = useState(initial.toWalletId ?? "");
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [description, setDescription] = useState(initial.description ?? "");
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  // Archived wallets and categories stay selectable only where this transaction already uses them.
  const usable = <T extends { id: string; archived: boolean }>(items: T[], keep: (string | null)[]) =>
    items.filter((i) => !i.archived || (mode === "edit" && keep.includes(i.id)));
  const walletChoices = usable(wallets, [initial.walletId, initial.toWalletId]);
  const categoryChoices = usable(categories, [initial.categoryId]).filter((c) => c.type === type);
  const availableTypes = mode === "new" ? TYPES : TYPES.filter((t) => (initial.type === "TRANSFER") === (t.value === "TRANSFER"));

  function chooseType(next: TransactionType) {
    setType(next);
    setError(null);
    if (next !== type) setCategoryId(null); // categories belong to one type; pick again (PRD 3.4 rule 8)
    if (next === "TRANSFER" && !toWalletId) setToWalletId(walletChoices.find((w) => w.id !== walletId)?.id ?? "");
  }

  async function submit(e: FormEvent, addAnother = false) {
    e.preventDefault();
    setSavedNote(null);
    const parsed = parseRupiah(amount);
    if (!parsed.ok || parsed.value <= 0) return setError({ field: "amount", message: "Enter an amount above Rp 0, in whole rupiah." });
    const occurredAt = localToInstant(date, time, timezone);
    if (Number.isNaN(occurredAt.getTime())) return setError({ field: "occurredAt", message: "Enter a date and time." });
    const body = {
      type,
      amount: parsed.value,
      walletId,
      toWalletId: type === "TRANSFER" ? toWalletId || null : null,
      categoryId: type === "TRANSFER" ? null : categoryId,
      description: description.trim() || null,
      occurredAt: occurredAt.toISOString(),
    };
    setSaving(true);
    setError(null);
    try {
      if (mode === "new") await api("/api/transactions", { method: "POST", body: { id, ...body } });
      else await api(`/api/transactions/${id}`, { method: "PATCH", body });
      if (addAnother) {
        setId(newId());
        setAmount("");
        setDescription("");
        setSavedNote(`Saved ${typeWord(type)} of ${formatRupiah(parsed.value)}.`);
        router.refresh();
      } else {
        router.push("/transactions");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof ApiError ? { field: err.field, message: err.message } : { message: "Something went wrong. Try again." });
    } finally {
      setSaving(false);
    }
  }

  const invalid = (field: string) => (error?.field === field ? " invalid" : "");
  const fieldError = (field: string) =>
    error?.field === field ? <span className="error" role="alert"><CircleAlert />{error.message}</span> : null;
  const label = (w: FormWallet) => `${w.name} · ${formatRupiah(w.balance)}${w.archived ? " (archived)" : ""}`;
  const saveLabel = !online ? "Saving needs a connection" : mode === "edit" ? "Save changes" : `Save ${typeWord(type)}`;

  return (
    <div className="split">
      <form className={`form${mode === "edit" ? " narrow" : ""}`} onSubmit={(e) => submit(e)} noValidate>
        <div className={`field${invalid("type")}`}>
          <span className="legend" id="type-l">Type</span>
          <div className="seg wide" role="group" aria-labelledby="type-l">
            {availableTypes.map(({ value, label: text, Icon }) => (
              <button key={value} type="button" aria-pressed={type === value} onClick={() => chooseType(value)}><Icon />{text}</button>
            ))}
          </div>
          {mode === "edit" && (
            <span className="type-lock">
              {initial.type === "TRANSFER"
                ? "A transfer can't become income or expense: delete it and record the right type instead."
                : "An expense can become income, and you pick the category again. It can't become a transfer: delete it and record a transfer instead."}
            </span>
          )}
          {fieldError("type")}
        </div>

        <div className={`field${invalid("amount")}`}>
          <label htmlFor="amt">Amount</label>
          <div className="amount-input"><span>Rp</span>
            <input className="fig" id="amt" inputMode="numeric" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} aria-describedby="amt-h" aria-invalid={!!invalid("amount")} />
          </div>
          {fieldError("amount")}
          <span className="hint" id="amt-h">Whole rupiah, more than 0.</span>
        </div>

        {type === "TRANSFER" ? (
          <>
            <div className="form-row">
              <div className={`field${invalid("walletId")}`}><label htmlFor="from">From wallet</label>
                <select className="input" id="from" value={walletId} onChange={(e) => setWalletId(e.target.value)}>
                  {walletChoices.map((w) => <option key={w.id} value={w.id}>{label(w)}</option>)}
                </select>{fieldError("walletId")}</div>
              <div className={`field${invalid("toWalletId")}`}><label htmlFor="to">To wallet</label>
                <select className="input" id="to" value={toWalletId} onChange={(e) => setToWalletId(e.target.value)}>
                  <option value="" disabled>Choose a wallet</option>
                  {walletChoices.filter((w) => w.id !== walletId).map((w) => <option key={w.id} value={w.id}>{label(w)}</option>)}
                </select>{fieldError("toWalletId")}</div>
            </div>
            <div className="notice info"><Info /><div>A transfer moves money between your own wallets. It never counts as income or expense. If you paid an admin fee, record it as a separate expense in Biaya Admin.</div></div>
          </>
        ) : (
          <div className={`field${invalid("walletId")}`}>
            <label htmlFor="wal">Wallet</label>
            <select className="input" id="wal" value={walletId} onChange={(e) => setWalletId(e.target.value)}>
              {walletChoices.map((w) => <option key={w.id} value={w.id}>{label(w)}</option>)}
            </select>
            {fieldError("walletId")}
          </div>
        )}

        {type !== "TRANSFER" && (
          <div className={`field${invalid("categoryId")}`}>
            <span className="legend" id="cat-l">Category</span>
            <div className="chips" role="radiogroup" aria-labelledby="cat-l">
              {categoryChoices.map((c) => {
                const Icon = categoryIcon(c.icon);
                return (
                  <button key={c.id} type="button" className="chip" role="radio" aria-checked={categoryId === c.id} onClick={() => setCategoryId(c.id)}><Icon />{c.name}</button>
                );
              })}
            </div>
            {fieldError("categoryId")}
            {mode === "edit" && type !== initial.type && !categoryId && <span className="hint">Choose an {typeWord(type)} category to finish the change.</span>}
          </div>
        )}

        <div className={`field${invalid("occurredAt")}`}>
          <div className="form-row">
            <div className="field"><label htmlFor="date">Date</label><input className="input" id="date" type="date" value={date} max={now.date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="field"><label htmlFor="time">Time</label><input className="input" id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          </div>
          {fieldError("occurredAt")}
          <span className="hint">{mode === "new" ? "Set to now. " : ""}It can&apos;t be in the future. Times are in {timezone}.</span>
        </div>

        <div className={`field${invalid("description")}`}>
          <label htmlFor="desc">Description <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
          <input className="input" id="desc" maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} />
          {fieldError("description")}
        </div>

        {error && !error.field && <div className="notice danger" role="alert"><CircleAlert /><div><strong>Not saved.</strong> {error.message}</div></div>}
        {savedNote && <div className="notice info" role="status"><Check /><div>{savedNote}</div></div>}

        <div className="form-actions sticky-save">
          <button className="btn lg" type="submit" disabled={saving || !online}>{saveLabel}</button>
          {mode === "new" ? (
            <button className="btn secondary lg only-desktop" type="button" disabled={saving || !online} onClick={(e) => submit(e, true)}>Save and add another</button>
          ) : (
            <Link className="btn quiet lg only-desktop" href="/transactions">Cancel</Link>
          )}
        </div>
      </form>

      {mode === "new" && (
        <AfterYouSave type={type} amount={parseRupiah(amount)} wallets={wallets} walletId={walletId} toWalletId={toWalletId} totalBalance={totalBalance} />
      )}
    </div>
  );
}

/** Shows how the Saldo and Total Balance move once this Transaksi is saved. */
function AfterYouSave(props: {
  type: TransactionType;
  amount: ReturnType<typeof parseRupiah>;
  wallets: FormWallet[];
  walletId: string;
  toWalletId: string;
  totalBalance: number;
}) {
  const n = props.amount.ok ? props.amount.value : 0;
  const from = props.wallets.find((w) => w.id === props.walletId);
  const to = props.wallets.find((w) => w.id === props.toWalletId);
  const fig = (before: number, after: number) => (
    <span className="fig">{before.toLocaleString("id-ID")}<span className="arrow">→</span>{after.toLocaleString("id-ID")}</span>
  );
  const delta = props.type === "INCOME" ? n : -n;
  return (
    <aside className="side only-desktop" aria-labelledby="after-h">
      <h2 id="after-h">After you save</h2>
      <div className="after">
        {props.type === "TRANSFER" ? (
          <>
            {from && <div className="row"><span className="grow"><span className="t">{from.name}</span><span className="s">From wallet</span></span>{fig(from.balance, from.balance - n)}</div>}
            {to && <div className="row"><span className="grow"><span className="t">{to.name}</span><span className="s">To wallet</span></span>{fig(to.balance, to.balance + n)}</div>}
            <div className="row"><span className="grow"><span className="t">Total balance</span><span className="s">All wallets</span></span><span className="tag">No change</span></div>
            <div className="row"><span className="grow"><span className="t">Income and expense</span><span className="s">A transfer is neither</span></span><span className="tag">No change</span></div>
          </>
        ) : (
          <>
            {from && <div className="row"><span className="grow"><span className="t">{from.name}</span><span className="s">Wallet balance</span></span>{fig(from.balance, from.balance + delta)}</div>}
            <div className="row"><span className="grow"><span className="t">Total balance</span><span className="s">All wallets</span></span>{fig(props.totalBalance, props.totalBalance + delta)}</div>
          </>
        )}
      </div>
    </aside>
  );
}
