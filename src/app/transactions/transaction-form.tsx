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
import { formatRupiah, keepAmountTyping, parseRupiah } from "@/domain/money";
import type { Translate } from "@/domain/i18n";
import type { TransactionType } from "@/domain/types";
import { api, ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n-client";
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
  /** Opened as the desktop dialog: the Save bar sticks to the dialog's bottom edge and the after-save panel sits beside the form. */
  inDialog?: boolean;
  /** Replaces "go to Transactions" after a save, e.g. closing the sheet back to where it was opened. */
  onSaved?: () => void;
  /** Adds a Cancel button next to Save (new transactions only). Edit keeps its own link back to Transactions. */
  onCancel?: () => void;
};

const TYPES = [
  { value: "EXPENSE", Icon: ArrowUpRight },
  { value: "INCOME", Icon: ArrowDownLeft },
  { value: "TRANSFER", Icon: ArrowLeftRight },
] as const;

export function TransactionForm({ mode, timezone, now, wallets, categories, initial, inSheet = false, inDialog = false, onSaved, onCancel }: Props) {
  const router = useRouter();
  const online = useOnline();
  const { t } = useT();
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
    if (!parsed.ok || parsed.value <= 0) return setError({ field: "amount", message: t("form.amountInvalid") });
    const occurredAt = localToInstant(date, time, timezone);
    if (Number.isNaN(occurredAt.getTime())) return setError({ field: "occurredAt", message: t("error.occurredAt.missing") });
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
        setSavedNote(t("form.saved", { type: t(`typeWord.${type}`), amount: formatRupiah(parsed.value) }));
        router.refresh();
        // The button that was pressed keeps focus otherwise; the next thing to type is the amount.
        document.getElementById("amt")?.focus();
      } else if (onSaved) {
        onSaved();
      } else {
        router.push("/transactions");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof ApiError ? { field: err.field, message: err.message } : { message: t("common.somethingWrong") });
    } finally {
      setSaving(false);
    }
  }

  const errorFor = (field: string) => (error?.field === field ? error.message : null);
  const label = (w: FormWallet) => `${w.name} · ${formatRupiah(w.balance)}${w.archived ? t("common.archivedSuffix") : ""}`;
  const saveLabel = !online ? t("common.savingNeedsConnection") : mode === "edit" ? t("common.saveChanges") : t("form.saveNew", { type: t(`typeWord.${type}`) });
  const walletSelect = (id: string, value: string, onChange: (v: string) => void, options: FormWallet[], field: string) => (
    <select className={inputClass(!!errorFor(field))} id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {id === "to" && <option value="" disabled>{t("form.chooseWallet")}</option>}
      {options.map((w) => <option key={w.id} value={w.id}>{label(w)}</option>)}
    </select>
  );

  return (
    <div className={inDialog ? "grid grid-cols-[minmax(0,1fr)] items-start gap-8 wide:grid-cols-[minmax(0,1fr)_300px]" : splitClass}>
      <form className={cx("flex flex-col gap-5", mode === "edit" && "max-w-[560px]")} onSubmit={(e) => submit(e)} noValidate>
        <Field
          label={t("common.type")}
          legendId="type-l"
          error={errorFor("type")}
          hint={
            mode === "edit" &&
            (initial.type === "TRANSFER" ? t("form.typeHintTransfer") : t("form.typeHintOther"))
          }
        >
          <div className={segClass} role="group" aria-labelledby="type-l">
            {availableTypes.map(({ value, Icon }) => (
              <button key={value} type="button" className={segButtonClass} aria-pressed={type === value} onClick={() => chooseType(value)}><Icon />{t(`type.${value}`)}</button>
            ))}
          </div>
        </Field>

        <Field label={t("form.amount")} htmlFor="amt" error={errorFor("amount")} hint={t("form.amountHint")} hintId="amt-h">
          <div
            className={cx(
              "flex items-baseline gap-2 border-b-2 pt-1 pb-1.5 focus-within:border-cobalt-ink focus-within:shadow-[0_2px_0_var(--color-cobalt-ink)]",
              errorFor("amount") ? "border-red" : "border-ink",
            )}
          >
            <span className="text-[22px] font-bold text-ink-2">Rp</span>
            <input
              className="fig min-w-0 flex-1 border-0 bg-transparent p-0 text-[44px] leading-[1.1] outline-0 md:text-[52px]"
              id="amt" inputMode="numeric" enterKeyHint="done" autoComplete="off" value={amount} onChange={(e) => setAmount(keepAmountTyping(e.target.value))}
              aria-describedby="amt-h" aria-invalid={!!errorFor("amount")}
            />
          </div>
        </Field>

        {type === "TRANSFER" ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("form.fromWallet")} htmlFor="from" error={errorFor("walletId")}>
                {walletSelect("from", walletId, setWalletId, walletChoices, "walletId")}
              </Field>
              <Field label={t("form.toWallet")} htmlFor="to" error={errorFor("toWalletId")}>
                {walletSelect("to", toWalletId, setToWalletId, walletChoices.filter((w) => w.id !== walletId), "toWalletId")}
              </Field>
            </div>
            <Notice tone="info">{t("form.transferNote")}</Notice>
          </>
        ) : (
          <Field label={t("common.wallet")} htmlFor="wal" error={errorFor("walletId")}>
            {walletSelect("wal", walletId, setWalletId, walletChoices, "walletId")}
          </Field>
        )}

        {type !== "TRANSFER" && (
          <Field
            label={t("common.category")}
            legendId="cat-l"
            error={errorFor("categoryId")}
            hint={
              mode === "edit" && type !== initial.type && !categoryId
                ? t("form.finishCategory", { type: t(`typeWord.${type}`) })
                : <Link href="/categories">{t("form.manageCategories")}</Link>
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
            <Field label={t("common.date")} htmlFor="date">
              <input className={inputClass(!!errorFor("occurredAt"))} id="date" type="date" value={date} max={now.date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={t("common.time")} htmlFor="time">
              <input className={inputClass(!!errorFor("occurredAt"))} id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <FieldError message={errorFor("occurredAt")} />
          <span className={hintClass}>{mode === "new" ? t("form.timeNow") : ""}{t("form.timeHint", { timezone })}</span>
        </div>

        <Field label={<>{t("common.description")} <span className="font-normal text-ink-2">{t("common.optional")}</span></>} htmlFor="desc" error={errorFor("description")}>
          <input className={inputClass(!!errorFor("description"))} id="desc" maxLength={120} enterKeyHint="done" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        {error && !error.field && <Notice tone="danger" role="alert"><strong>{t("form.notSaved")}</strong> {error.message}</Notice>}
        {savedNote && <Notice tone="info" icon={Check} role="status">{savedNote}</Notice>}

        <div
          className={cx(
            "flex flex-wrap items-center gap-2.5",
            "max-md:sticky max-md:z-[5] max-md:border-t max-md:border-line max-md:bg-paper max-md:pt-3 max-md:[&>button]:min-h-[50px] max-md:[&>button]:w-full",
            // On a screen the bar sits on the tab bar; in the sheet it sits on the bottom edge, above the home indicator.
            inSheet
              ? "max-md:bottom-0 max-md:pb-[calc(12px+env(safe-area-inset-bottom))]"
              : "max-md:bottom-[calc(62px+env(safe-area-inset-bottom))] max-md:pb-5",
            // In the dialog the bar stays in reach however far the form scrolls.
            inDialog && "md:sticky md:bottom-0 md:z-[5] md:border-t md:border-line md:bg-paper md:pt-4 md:pb-6",
          )}
        >
          <Button type="submit" size="lg" disabled={saving || !online}>{saveLabel}</Button>
          {mode === "new" ? (
            <>
              <Button variant="secondary" size="lg" className={onlyDesktop} disabled={saving || !online} onClick={(e) => submit(e, true)}>{t("form.saveAndAdd")}</Button>
              {onCancel && <Button type="button" variant="quiet" size="lg" className={onlyDesktop} onClick={onCancel}>{t("common.cancel")}</Button>}
            </>
          ) : (
            <Link className={buttonClass("quiet", "lg", onlyDesktop)} href="/transactions">{t("common.cancel")}</Link>
          )}
        </div>
      </form>

      {mode === "new" && (
        <AfterYouSave t={t} type={type} amount={parseRupiah(amount)} wallets={wallets} walletId={walletId} toWalletId={toWalletId} />
      )}
    </div>
  );
}

/** Shows how the Saldo and Total Balance move once this Transaksi is saved, using the same rules as the server. */
function AfterYouSave(props: {
  t: Translate;
  type: TransactionType;
  amount: ReturnType<typeof parseRupiah>;
  wallets: FormWallet[];
  walletId: string;
  toWalletId: string;
}) {
  const { t } = props;
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
  const noChange = <span className="inline-flex items-center rounded-[3px] bg-surface px-2 py-0.5 text-[12.5px] font-semibold text-ink-2">{t("after.noChange")}</span>;
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
      <h2 id="after-h" className={cx(h2, "mb-4")}>{t("after.title")}</h2>
      <div className={rowsClass}>
        {from && line(from.name, props.type === "TRANSFER" ? t("form.fromWallet") : t("after.walletBalance"), fig(before.get(from.id)!, after.get(from.id)!))}
        {to && line(to.name, t("form.toWallet"), fig(before.get(to.id)!, after.get(to.id)!))}
        {line(t("dash.totalBalance"), t("after.allWallets"), totalBefore === totalAfter ? noChange : fig(totalBefore, totalAfter))}
        {props.type === "TRANSFER" && line(t("after.incomeExpense"), t("after.transferNeither"), noChange)}
      </div>
    </aside>
  );
}
