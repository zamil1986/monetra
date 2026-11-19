"use client";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { categoryIcon } from "@/components/icons";
import {
  Button, Field, FieldError, Notice, buttonClass, chipClass, cx, h2, hintClass, inputClass, onlyDesktop, rowClass, rowSub, rowTitle,
  rowsClass, segButtonClass, segClass, sidePanel, splitClass,
} from "@/components/ui";
import { balancesByWallet } from "@/domain/balance";
import { localToInstant } from "@/domain/local-time";
import { formatRupiah, parseRupiah } from "@/domain/money";
import type { TransactionType } from "@/domain/types";
import { api, ApiError } from "@/lib/api";
import { haptic } from "@/lib/haptics";
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
  initial: FormInitial;
  /** Opened as the phone sheet over another screen: no tab bar under the Save bar, and saving closes the sheet. */
  inSheet?: boolean;
  /** Replaces "go to Transactions" after a save, e.g. closing the sheet back to where it was opened. */
  onSaved?: () => void;
};

const TYPES = [
  { value: "EXPENSE", label: "Expense", Icon: ArrowUpRight },
  { value: "INCOME", label: "Income", Icon: ArrowDownLeft },
  { value: "TRANSFER", label: "Transfer", Icon: ArrowLeftRight },
] as const;

const typeWord = (t: TransactionType) => t.toLowerCase();

export function TransactionForm({ mode, timezone, now, wallets, categories, initial, inSheet = false, onSaved }: Props) {
  const router = useRouter();
  const online = useOnline();
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
      if (mode === "new") await api("/api/transactions", { method: "POST", body });
      else await api(`/api/transactions/${initial.id}`, { method: "PATCH", body });
      haptic();
      if (addAnother) {
        setAmount("");
        setDescription("");
        setSavedNote(`Saved ${typeWord(type)} of ${formatRupiah(parsed.value)}.`);
        router.refresh();
      } else if (onSaved) {
        onSaved();
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

  const errorFor = (field: string) => (error?.field === field ? error.message : null);
  const label = (w: FormWallet) => `${w.name} · ${formatRupiah(w.balance)}${w.archived ? " (archived)" : ""}`;
  const saveLabel = !online ? "Saving needs a connection" : mode === "edit" ? "Save changes" : `Save ${typeWord(type)}`;
  const walletSelect = (id: string, value: string, onChange: (v: string) => void, options: FormWallet[], field: string) => (
    <select className={inputClass(!!errorFor(field))} id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {id === "to" && <option value="" disabled>Choose a wallet</option>}
      {options.map((w) => <option key={w.id} value={w.id}>{label(w)}</option>)}
    </select>
  );

  return (
    <div className={splitClass}>
      <form className={cx("flex flex-col gap-5", mode === "edit" && "max-w-[560px]")} onSubmit={(e) => submit(e)} noValidate>
        <Field
          label="Type"
          legendId="type-l"
          error={errorFor("type")}
          hint={
            mode === "edit" &&
            (initial.type === "TRANSFER"
              ? "A transfer can't become income or expense: delete it and record the right type instead."
              : "An expense can become income, and you pick the category again. It can't become a transfer: delete it and record a transfer instead.")
          }
        >
          <div className={segClass} role="group" aria-labelledby="type-l">
            {availableTypes.map(({ value, label: text, Icon }) => (
              <button key={value} type="button" className={segButtonClass} aria-pressed={type === value} onClick={() => chooseType(value)}><Icon />{text}</button>
            ))}
          </div>
        </Field>

        <Field label="Amount" htmlFor="amt" error={errorFor("amount")} hint="Whole rupiah, more than 0." hintId="amt-h">
          <div
            className={cx(
              "flex items-baseline gap-2 border-b-2 pt-1 pb-1.5 focus-within:border-cobalt focus-within:shadow-[0_2px_0_var(--color-cobalt)]",
              errorFor("amount") ? "border-red" : "border-ink",
            )}
          >
            <span className="text-[22px] font-bold text-ink-2">Rp</span>
            <input
              className="fig min-w-0 flex-1 border-0 bg-transparent p-0 text-[44px] leading-[1.1] outline-0 md:text-[52px]"
              id="amt" inputMode="numeric" enterKeyHint="done" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)}
              aria-describedby="amt-h" aria-invalid={!!errorFor("amount")}
            />
          </div>
        </Field>

        {type === "TRANSFER" ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="From wallet" htmlFor="from" error={errorFor("walletId")}>
                {walletSelect("from", walletId, setWalletId, walletChoices, "walletId")}
              </Field>
              <Field label="To wallet" htmlFor="to" error={errorFor("toWalletId")}>
                {walletSelect("to", toWalletId, setToWalletId, walletChoices.filter((w) => w.id !== walletId), "toWalletId")}
              </Field>
            </div>
            <Notice tone="info">
              A transfer moves money between your own wallets. It never counts as income or expense. If you paid an admin fee, record it as a separate
              expense in Biaya Admin.
            </Notice>
          </>
        ) : (
          <Field label="Wallet" htmlFor="wal" error={errorFor("walletId")}>
            {walletSelect("wal", walletId, setWalletId, walletChoices, "walletId")}
          </Field>
        )}

        {type !== "TRANSFER" && (
          <Field
            label="Category"
            legendId="cat-l"
            error={errorFor("categoryId")}
            hint={
              mode === "edit" && type !== initial.type && !categoryId
                ? `Choose an ${typeWord(type)} category to finish the change.`
                : <Link href="/categories">Manage categories</Link>
            }
          >
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="cat-l">
              {categoryChoices.map((c) => {
                const Icon = categoryIcon(c.icon);
                return (
                  <button key={c.id} type="button" className={chipClass()} role="radio" aria-checked={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                    <Icon />{c.name}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Date" htmlFor="date">
              <input className={inputClass(!!errorFor("occurredAt"))} id="date" type="date" value={date} max={now.date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Time" htmlFor="time">
              <input className={inputClass(!!errorFor("occurredAt"))} id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <FieldError message={errorFor("occurredAt")} />
          <span className={hintClass}>{mode === "new" ? "Set to now. " : ""}It can&apos;t be in the future. Times are in {timezone}.</span>
        </div>

        <Field label={<>Description <span className="font-normal text-ink-2">(optional)</span></>} htmlFor="desc" error={errorFor("description")}>
          <input className={inputClass(!!errorFor("description"))} id="desc" maxLength={120} enterKeyHint="done" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        {error && !error.field && <Notice tone="danger" role="alert"><strong>Not saved.</strong> {error.message}</Notice>}
        {savedNote && <Notice tone="info" icon={Check} role="status">{savedNote}</Notice>}

        <div
          className={cx(
            "flex flex-wrap items-center gap-2.5",
            "max-md:sticky max-md:z-[5] max-md:border-t max-md:border-line max-md:bg-paper max-md:pt-3 max-md:[&>button]:min-h-[50px] max-md:[&>button]:w-full",
            // On a screen the bar sits on the tab bar; in the sheet it sits on the bottom edge, above the home indicator.
            inSheet
              ? "max-md:bottom-0 max-md:pb-[calc(12px+env(safe-area-inset-bottom))]"
              : "max-md:bottom-[calc(62px+env(safe-area-inset-bottom))] max-md:pb-5",
          )}
        >
          <Button type="submit" size="lg" disabled={saving || !online}>{saveLabel}</Button>
          {mode === "new" ? (
            <Button variant="secondary" size="lg" className={onlyDesktop} disabled={saving || !online} onClick={(e) => submit(e, true)}>Save and add another</Button>
          ) : (
            <Link className={buttonClass("quiet", "lg", onlyDesktop)} href="/transactions">Cancel</Link>
          )}
        </div>
      </form>

      {mode === "new" && (
        <AfterYouSave type={type} amount={parseRupiah(amount)} wallets={wallets} walletId={walletId} toWalletId={toWalletId} />
      )}
    </div>
  );
}

/** Shows how the Saldo and Total Balance move once this Transaksi is saved, using the same rules as the server. */
function AfterYouSave(props: {
  type: TransactionType;
  amount: ReturnType<typeof parseRupiah>;
  wallets: FormWallet[];
  walletId: string;
  toWalletId: string;
}) {
  const amount = props.amount.ok && props.amount.value > 0 ? props.amount.value : 0;
  const now = props.wallets.map((w) => ({ id: w.id, openingBalance: w.balance, archived: w.archived }));
  const movement = { type: props.type, amount, walletId: props.walletId, toWalletId: props.type === "TRANSFER" ? props.toWalletId || null : null };
  const after = balancesByWallet(now, [movement]);
  const total = (balances: Map<string, number>) => now.filter((w) => !w.archived).reduce((sum, w) => sum + (balances.get(w.id) ?? 0), 0);
  const before = balancesByWallet(now, []);

  const from = props.wallets.find((w) => w.id === props.walletId);
  const to = props.type === "TRANSFER" ? props.wallets.find((w) => w.id === props.toWalletId) : undefined;
  const fig = (a: number, b: number) => (
    <span className="fig whitespace-nowrap text-lg">{a.toLocaleString("id-ID")}<span className="mx-1 text-ink-3">→</span>{b.toLocaleString("id-ID")}</span>
  );
  const noChange = <span className="inline-flex items-center rounded-[3px] bg-white px-2 py-0.5 text-[12.5px] font-semibold text-ink-2">No change</span>;
  const line = (title: string, sub: string, value: ReactNode) => (
    <div className={rowClass}>
      <span className="min-w-0 flex-1"><span className={rowTitle}>{title}</span><span className={rowSub}>{sub}</span></span>
      {value}
    </div>
  );
  const totalBefore = total(before);
  const totalAfter = total(after);

  return (
    <aside className={cx(sidePanel, onlyDesktop)} aria-labelledby="after-h">
      <h2 id="after-h" className={cx(h2, "mb-4")}>After you save</h2>
      <div className={rowsClass}>
        {from && line(from.name, props.type === "TRANSFER" ? "From wallet" : "Wallet balance", fig(before.get(from.id)!, after.get(from.id)!))}
        {to && line(to.name, "To wallet", fig(before.get(to.id)!, after.get(to.id)!))}
        {line("Total balance", "All wallets", totalBefore === totalAfter ? noChange : fig(totalBefore, totalAfter))}
        {props.type === "TRANSFER" && line("Income and expense", "A transfer is neither", noChange)}
      </div>
    </aside>
  );
}
