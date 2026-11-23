"use client";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AmountInput } from "@/components/amount-input";
import { ConfirmDelete } from "@/components/confirm-delete";
import { FormDialog } from "@/components/form-dialog";
import { useToast } from "@/components/toast";
import { Glyph, WALLET_ICONS, hue, walletIcon } from "@/components/icons";
import { Rich } from "@/components/rich";
import {
  Button, Field, FieldError, Notice, Page, PageHead, chipClass, cx, h1, h2, iconButtonClass, inputClass,
  noticeActions, onlyDesktop, rowClass, rowFig, rowSub, rowTitle, rowsClass, spacer,
} from "@/components/ui";
import { formatRupiah, parseRupiah } from "@/domain/money";
import { COLORS } from "@/domain/palette";
import type { WalletColor, WalletIcon } from "@/domain/wallet-rules";
import { api, ApiError } from "@/lib/api";
import { longDate } from "@/lib/dates";
import { useT } from "@/lib/i18n-client";
import { useOnline } from "@/lib/use-online";

export type WalletRow = {
  id: string;
  name: string;
  openingBalance: number;
  balance: number;
  color: WalletColor;
  icon: WalletIcon;
  archived: boolean;
  archivedOn: string | null;
  transactionCount: number;
  deletable: boolean;
};

export function WalletsManager({ wallets, totalBalance }: { wallets: WalletRow[]; totalBalance: number }) {
  const router = useRouter();
  const online = useOnline();
  const toast = useToast();
  const { t, lang } = useT();
  // Open and target are apart so the title and fields stay put while the dialog animates out.
  const [formOpen, setFormOpen] = useState(false);
  const [target, setTarget] = useState<WalletRow | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [refusal, setRefusal] = useState<{ id: string; message: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const locked = (id: string) => busy === id || !online; // changes need a connection (PRD 5.5)
  const active = wallets.filter((w) => !w.archived);
  const archived = wallets.filter((w) => w.archived);

  /** Each opening starts from a fresh form: New after an edit is always empty. */
  function openForm(wallet: WalletRow | null) {
    setTarget(wallet);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  async function act(wallet: WalletRow, action: "archive" | "unarchive") {
    setBusy(wallet.id);
    setRefusal(null);
    try {
      await api(`/api/wallets/${wallet.id}/${action}`, { method: "POST" });
      router.refresh();
    } catch (e) {
      setRefusal({ id: wallet.id, message: e instanceof ApiError ? e.message : t("common.somethingWrong") });
    } finally {
      setBusy(null);
    }
  }

  /** Delete, after the confirmation: the error is shown in the dialog, the outcome in a toast. */
  async function remove(wallet: WalletRow) {
    try {
      await api(`/api/wallets/${wallet.id}`, { method: "DELETE" });
      toast({ message: t("wallets.deleted", { name: wallet.name }) });
      router.refresh();
      return null;
    } catch (e) {
      return e instanceof ApiError ? e.message : t("common.somethingWrong");
    }
  }

  return (
    <>
      <PageHead>
        <h1 className={h1}>{t("nav.wallets")}</h1>
        <span className={spacer} />
        <Button onClick={() => openForm(null)}><Plus />{t("wallets.new")}</Button>
      </PageHead>
      <Page>
        <div className="flex max-w-[760px] flex-col gap-8 md:gap-9">
          <section aria-labelledby="act-h">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <h2 id="act-h" className={h2}>{t("dash.totalBalance")}</h2>
              <span className="text-meta text-ink-2">{t("wallets.activeCount", { count: active.length })}</span>
            </div>
            <p className={cx("fig mt-1 mb-[18px] text-[52px] leading-none md:text-[72px]", totalBalance < 0 && "text-red")}>
              <span className="mr-[0.18em] text-[0.5em] font-bold">{totalBalance < 0 ? "−Rp" : "Rp"}</span>
              {Math.abs(totalBalance).toLocaleString("id-ID")}
            </p>
            <div className={rowsClass}>
              {active.map((w) => {
                const share = totalBalance > 0 && w.balance > 0 ? Math.round((w.balance / totalBalance) * 100) : 0;
                return (
                  <div key={w.id}>
                    <div className={rowClass}>
                      <Glyph Icon={walletIcon(w.icon)} color={w.color} />
                      <span className="min-w-0 flex-1">
                        <span className={rowTitle}>{w.name}</span>
                        {/* Below zero from a non-negative start usually means an unrecorded transfer in. */}
                        {w.balance < 0 && w.openingBalance >= 0 ? (
                          <span className={rowSub}><Rich text={t("wallets.belowZero")} tags={{ red: (c) => <span className="text-red">{c}</span> }} /></span>
                        ) : (
                          <span className={rowSub}>
                            {t("wallets.opening", { amount: formatRupiah(w.openingBalance) })}<span className={onlyDesktop}>{t("wallets.share", { share })}</span>
                          </span>
                        )}
                        {w.balance > 0 && (
                          <span
                            className="mt-1.5 block h-1.5 w-[calc(var(--p)*1%)] min-w-[3px] bg-(--c)"
                            style={{ ["--p" as string]: share, ["--c" as string]: hue(w.color) }}
                          />
                        )}
                      </span>
                      <span className={cx(rowFig, w.balance < 0 && "text-red")}>{formatRupiah(w.balance)}</span>
                      <span className="inline-flex flex-none items-center justify-end gap-0.5 md:min-w-[76px]">
                        <button className={iconButtonClass()} type="button" aria-label={t("common.edit", { name: w.name })} onClick={() => openForm(w)}><Pencil /></button>
                        {w.deletable ? (
                          <ConfirmDelete
                            title={t("wallets.del.title")}
                            body={t("wallets.del.body")}
                            item={{ title: w.name, aside: formatRupiah(w.balance) }}
                            confirmLabel={t("wallets.del.confirm")}
                            onConfirm={() => remove(w)}
                            trigger={(open) => (
                              <button className={iconButtonClass(true)} type="button" aria-label={t("common.delete", { name: w.name })} disabled={locked(w.id)} onClick={open}><Trash2 /></button>
                            )}
                          />
                        ) : (
                          <button className={iconButtonClass()} type="button" aria-label={t("common.archive", { name: w.name })} disabled={locked(w.id)} onClick={() => act(w, "archive")}><Archive /></button>
                        )}
                      </span>
                    </div>
                    {refusal?.id === w.id && (
                      <Notice tone="warn" role="alert" className="my-2">
                        <strong>{refusal.message}</strong>
                        <div className={noticeActions}>
                          <Link href="/transactions/new?type=transfer">{t("wallets.transferOut")}</Link>
                          <Link href="/transactions/new">{t("wallets.recordExpense")}</Link>
                        </div>
                      </Notice>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {archived.length > 0 && (
            <section aria-labelledby="arch-h">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t-2 border-ink pt-3.5">
                <h2 id="arch-h" className={h2}>{t("common.archived")}</h2>
                <span className="text-meta text-ink-2">{t("wallets.archivedNote")}</span>
              </div>
              {archived.map((w) => (
                <div className={rowClass} key={w.id}>
                  <Glyph Icon={walletIcon(w.icon)} color={null} />
                  <span className="min-w-0 flex-1">
                    <span className={rowTitle}>{w.name}</span>
                    <span className={rowSub}>
                      {t("wallets.archivedOn", { date: w.archivedOn ? longDate(w.archivedOn, lang) : "" })} · {t("tx.count", { count: w.transactionCount })}
                    </span>
                  </span>
                  <span className={cx(rowFig, "text-ink-2")}>{formatRupiah(w.balance)}</span>
                  <Button variant="quiet" disabled={locked(w.id)} onClick={() => act(w, "unarchive")}><ArchiveRestore />{t("common.unarchive")}</Button>
                </div>
              ))}
            </section>
          )}
        </div>
      </Page>
      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={target ? t("common.edit", { name: target.name }) : t("wallets.new")}
        initialFocusId="w-name"
      >
        <WalletForm
          key={formKey}
          wallet={target}
          onDone={(name) => {
            setFormOpen(false);
            toast({ message: t(target ? "wallets.saved" : "wallets.created", { name }) });
            router.refresh();
          }}
          onCancel={() => setFormOpen(false)}
        />
      </FormDialog>
    </>
  );
}

function WalletForm({ wallet, onDone, onCancel }: { wallet: WalletRow | null; onDone: (name: string) => void; onCancel: () => void }) {
  const online = useOnline();
  const { t } = useT();
  const [name, setName] = useState(wallet?.name ?? "");
  const [opening, setOpening] = useState(wallet ? formatRupiah(wallet.openingBalance).replace("Rp ", "") : "0");
  const [color, setColor] = useState<WalletColor>(wallet?.color ?? "blue");
  const [icon, setIcon] = useState<WalletIcon>(wallet?.icon ?? "bank");
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const amount = parseRupiah(opening);
    if (!amount.ok) return setError({ field: "openingBalance", message: t(amount.error) });
    setSaving(true);
    setError(null);
    try {
      const body = { name, openingBalance: amount.value, color, icon };
      if (wallet) await api(`/api/wallets/${wallet.id}`, { method: "PATCH", body });
      else await api("/api/wallets", { method: "POST", body });
      onDone(name.trim());
    } catch (err) {
      setError(err instanceof ApiError ? { field: err.field, message: err.message } : { message: t("common.somethingWrong") });
    } finally {
      setSaving(false);
    }
  }

  const errorFor = (field: string) => (error?.field === field ? error.message : null);
  /** A field's error goes as soon as that field changes. */
  const changed = (field: string) => setError((e) => (e?.field === field ? null : e));

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <Field label={t("common.name")} htmlFor="w-name" error={errorFor("name")}>
        <input
          className={inputClass(!!errorFor("name"))} id="w-name" placeholder={t("wallets.namePlaceholder")} maxLength={40}
          value={name} onChange={(e) => { changed("name"); setName(e.target.value); }} aria-invalid={!!errorFor("name")}
        />
      </Field>
      <Field
        label={t("wallets.openingLabel")}
        htmlFor="w-open"
        error={errorFor("openingBalance")}
        hintId="w-open-h"
        hint={t("wallets.openingHint")}
      >
        <div className="relative">
          <AmountInput
            className={inputClass(!!errorFor("openingBalance"), "fig pl-11 text-xl")} id="w-open" inputMode="text" allowMinus
            value={opening} onValueChange={(v) => { changed("openingBalance"); setOpening(v); }} aria-describedby="w-open-h" aria-invalid={!!errorFor("openingBalance")}
          />
          <span className="absolute top-[11px] left-3 font-bold text-ink-2">Rp</span>
        </div>
      </Field>
      <Field label={t("common.color")} legendId="w-col">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="w-col">
          {COLORS.map((c) => (
            <button
              key={c} type="button" role="radio" aria-checked={color === c} aria-label={t(`color.${c}`)}
              className="size-8 cursor-pointer rounded border-2 border-surface bg-(--c) outline-1 outline-line aria-checked:outline-2 aria-checked:outline-ink"
              style={{ ["--c" as string]: hue(c) }} onClick={() => setColor(c)}
            />
          ))}
        </div>
      </Field>
      <Field label={t("common.icon")} legendId="w-ico">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="w-ico">
          {(Object.keys(WALLET_ICONS) as WalletIcon[]).map((key) => {
            const { Icon } = WALLET_ICONS[key]!;
            return <button key={key} type="button" className={chipClass()} role="radio" aria-checked={icon === key} onClick={() => setIcon(key)}><Icon />{t(`walletIcon.${key}`)}</button>;
          })}
        </div>
      </Field>
      {error && !error.field && <FieldError message={error.message} />}
      <Button type="submit" size="lg" disabled={saving || !online}>
        {!online ? t("common.savingNeedsConnection") : wallet ? t("common.saveChanges") : t("wallets.create")}
      </Button>
      <Button variant="quiet" onClick={onCancel}>{t("common.cancel")}</Button>
      {!wallet && <p className="text-meta text-ink-2">{t("wallets.deleteNote")}</p>}
    </form>
  );
}
