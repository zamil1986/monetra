"use client";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Glyph, WALLET_ICONS, hue, walletIcon } from "@/components/icons";
import {
  Button, Field, FieldError, Notice, Page, PageHead, buttonClass, chipClass, cx, h1, h2, iconButtonClass, inputClass,
  noticeActions, onlyDesktop, onlyMobile, rowClass, rowFig, rowSub, rowTitle, rowsClass, sidePanel, spacer, splitClass,
} from "@/components/ui";
import { formatRupiah, parseRupiah } from "@/domain/money";
import { WALLET_COLORS, type WalletColor, type WalletIcon } from "@/domain/wallet-rules";
import { api, ApiError } from "@/lib/api";
import { longDate } from "@/lib/dates";
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
  const [editing, setEditing] = useState<WalletRow | null>(null);
  const [refusal, setRefusal] = useState<{ id: string; message: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const locked = (id: string) => busy === id || !online; // changes need a connection (PRD 5.5)
  const active = wallets.filter((w) => !w.archived);
  const archived = wallets.filter((w) => w.archived);

  async function act(wallet: WalletRow, action: "archive" | "unarchive" | "delete") {
    setBusy(wallet.id);
    setRefusal(null);
    try {
      if (action === "delete") await api(`/api/wallets/${wallet.id}`, { method: "DELETE" });
      else await api(`/api/wallets/${wallet.id}/${action}`, { method: "POST" });
      if (editing?.id === wallet.id) setEditing(null);
      router.refresh();
    } catch (e) {
      setRefusal({ id: wallet.id, message: e instanceof ApiError ? e.message : "Something went wrong. Try again." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHead>
        <h1 className={h1}>Wallets</h1>
        <span className={spacer} />
        <a className={buttonClass("primary", "md", onlyMobile)} href="#wallet-form" onClick={() => setEditing(null)}><Plus />New wallet</a>
      </PageHead>
      <Page>
        <div className={splitClass}>
          <div className="flex flex-col gap-8 md:gap-9">
            <section aria-labelledby="act-h">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h2 id="act-h" className={h2}>Total balance</h2>
                <span className="text-meta text-ink-2">{active.length} active {active.length === 1 ? "wallet" : "wallets"}</span>
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
                            <span className={rowSub}><span className="text-red">Below zero.</span> A transfer in may be missing.</span>
                          ) : (
                            <span className={rowSub}>
                              Opening balance {formatRupiah(w.openingBalance)}<span className={onlyDesktop}> · {share}% of total</span>
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
                          <button className={iconButtonClass()} type="button" aria-label={`Edit ${w.name}`} onClick={() => setEditing(w)}><Pencil /></button>
                          {w.deletable ? (
                            <button className={iconButtonClass(true)} type="button" aria-label={`Delete ${w.name}`} disabled={locked(w.id)} onClick={() => act(w, "delete")}><Trash2 /></button>
                          ) : (
                            <button className={iconButtonClass()} type="button" aria-label={`Archive ${w.name}`} disabled={locked(w.id)} onClick={() => act(w, "archive")}><Archive /></button>
                          )}
                        </span>
                      </div>
                      {refusal?.id === w.id && (
                        <Notice tone="warn" role="alert" className="my-2">
                          <strong>{refusal.message}</strong>
                          <div className={noticeActions}>
                            <Link href="/transactions/new?type=transfer">Transfer the balance out</Link>
                            <Link href="/transactions/new">Record it as an expense</Link>
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
                  <h2 id="arch-h" className={h2}>Archived</h2>
                  <span className="text-meta text-ink-2">Hidden from new transactions, kept in history. Unarchive to edit.</span>
                </div>
                {archived.map((w) => (
                  <div className={rowClass} key={w.id}>
                    <Glyph Icon={walletIcon(w.icon)} color={null} />
                    <span className="min-w-0 flex-1">
                      <span className={rowTitle}>{w.name}</span>
                      <span className={rowSub}>
                        Archived {w.archivedOn ? longDate(w.archivedOn) : ""} · {w.transactionCount} {w.transactionCount === 1 ? "transaction" : "transactions"}
                      </span>
                    </span>
                    <span className={cx(rowFig, "text-ink-2")}>{formatRupiah(w.balance)}</span>
                    <Button variant="quiet" disabled={locked(w.id)} onClick={() => act(w, "unarchive")}><ArchiveRestore />Unarchive</Button>
                  </div>
                ))}
              </section>
            )}
          </div>

          <WalletForm
            key={editing?.id ?? "new"}
            wallet={editing}
            onDone={() => { setEditing(null); router.refresh(); }}
            onCancel={() => setEditing(null)}
          />
        </div>
      </Page>
    </>
  );
}

function WalletForm({ wallet, onDone, onCancel }: { wallet: WalletRow | null; onDone: () => void; onCancel: () => void }) {
  const online = useOnline();
  const [name, setName] = useState(wallet?.name ?? "");
  const [opening, setOpening] = useState(wallet ? formatRupiah(wallet.openingBalance).replace("Rp ", "") : "0");
  const [color, setColor] = useState<WalletColor>(wallet?.color ?? "blue");
  const [icon, setIcon] = useState<WalletIcon>(wallet?.icon ?? "bank");
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const amount = parseRupiah(opening);
    if (!amount.ok) return setError({ field: "openingBalance", message: amount.error });
    setSaving(true);
    setError(null);
    try {
      const body = { name, openingBalance: amount.value, color, icon };
      if (wallet) await api(`/api/wallets/${wallet.id}`, { method: "PATCH", body });
      else await api("/api/wallets", { method: "POST", body });
      if (!wallet) { setName(""); setOpening("0"); }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? { field: err.field, message: err.message } : { message: "Something went wrong. Try again." });
    } finally {
      setSaving(false);
    }
  }

  const errorFor = (field: string) => (error?.field === field ? error.message : null);

  return (
    <aside className={sidePanel} id="wallet-form" aria-labelledby="nw-h">
      <h2 id="nw-h" className={cx(h2, "mb-4")}>{wallet ? `Edit ${wallet.name}` : "New wallet"}</h2>
      <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
        <Field label="Name" htmlFor="w-name" error={errorFor("name")}>
          <input
            className={inputClass(!!errorFor("name"))} id="w-name" placeholder="e.g. BCA, Cash, GoPay" maxLength={40}
            value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errorFor("name")}
          />
        </Field>
        <Field
          label="Opening balance"
          htmlFor="w-open"
          error={errorFor("openingBalance")}
          hintId="w-open-h"
          hint="What the wallet held before its first recorded transaction. Start with a minus if you owed money, e.g. −250.000. You can change it later and the balance follows."
        >
          <div className="relative">
            <input
              className={inputClass(!!errorFor("openingBalance"), "fig pl-11 text-xl")} id="w-open" inputMode="text"
              value={opening} onChange={(e) => setOpening(e.target.value)} aria-describedby="w-open-h" aria-invalid={!!errorFor("openingBalance")}
            />
            <span className="absolute top-[11px] left-3 font-bold text-ink-2">Rp</span>
          </div>
        </Field>
        <Field label="Color" legendId="w-col">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="w-col">
            {WALLET_COLORS.map((c) => (
              <button
                key={c} type="button" role="radio" aria-checked={color === c} aria-label={c[0]!.toUpperCase() + c.slice(1)}
                className="size-8 cursor-pointer rounded border-2 border-white bg-(--c) outline-1 outline-line aria-checked:outline-2 aria-checked:outline-ink"
                style={{ ["--c" as string]: hue(c) }} onClick={() => setColor(c)}
              />
            ))}
          </div>
        </Field>
        <Field label="Icon" legendId="w-ico">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="w-ico">
            {(Object.keys(WALLET_ICONS) as WalletIcon[]).map((key) => {
              const { Icon, label } = WALLET_ICONS[key]!;
              return <button key={key} type="button" className={chipClass()} role="radio" aria-checked={icon === key} onClick={() => setIcon(key)}><Icon />{label}</button>;
            })}
          </div>
        </Field>
        {error && !error.field && <FieldError message={error.message} />}
        <Button type="submit" size="lg" disabled={saving || !online}>
          {!online ? "Saving needs a connection" : wallet ? "Save changes" : "Create wallet"}
        </Button>
        {wallet ? (
          <Button variant="quiet" onClick={onCancel}>Cancel</Button>
        ) : (
          <p className="text-meta text-ink-2">A wallet that has never been used can be deleted. Once it has transactions it can only be archived.</p>
        )}
      </form>
    </aside>
  );
}
