"use client";
import { Archive, ArchiveRestore, CircleAlert, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Glyph, WALLET_ICONS, hue } from "@/components/icons";
import { formatRupiah, parseRupiah } from "@/domain/money";
import { WALLET_COLORS } from "@/domain/wallet-rules";
import { api, ApiError } from "@/lib/api";
import { useOnline } from "@/lib/use-online";

type Wallet = {
  id: string;
  name: string;
  openingBalance: number;
  balance: number;
  color: string;
  icon: string;
  archived: boolean;
  archivedOn: string | null;
  transactionCount: number;
  deletable: boolean;
};

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function WalletsManager({ wallets, totalBalance }: { wallets: Wallet[]; totalBalance: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [refusal, setRefusal] = useState<{ id: string; message: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const online = useOnline();
  const locked = (id: string) => busy === id || !online; // changes need a connection (PRD 5.5)
  const active = wallets.filter((w) => !w.archived);
  const archived = wallets.filter((w) => w.archived);

  async function act(wallet: Wallet, action: "archive" | "unarchive" | "delete") {
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
      <div className="page-head">
        <h1>Wallets</h1>
        <span className="spacer" />
        <a className="btn only-mobile" href="#wallet-form" onClick={() => setEditing(null)}><Plus />New wallet</a>
      </div>
      <main className="page">
        <div className="split">
          <div className="stack">
            <section aria-labelledby="act-h">
              <div className="block-head" style={{ marginBottom: 0 }}>
                <h2 id="act-h">Total balance</h2>
                <span className="small muted">{active.length} active {active.length === 1 ? "wallet" : "wallets"}</span>
              </div>
              <p className={`total fig${totalBalance < 0 ? " neg" : ""}`} style={{ marginBottom: 18 }}>
                <span className="rp">{totalBalance < 0 ? "−Rp" : "Rp"}</span>{Math.abs(totalBalance).toLocaleString("id-ID")}
              </p>
              <div className="rows">
                {active.map((w) => {
                  const share = totalBalance > 0 && w.balance > 0 ? Math.round((w.balance / totalBalance) * 100) : 0;
                  const { Icon } = WALLET_ICONS[w.icon] ?? WALLET_ICONS.bank!;
                  return (
                    <div key={w.id}>
                      <div className="row">
                        <Glyph Icon={Icon} color={w.color} />
                        <span className="grow">
                          <span className="t">{w.name}</span>
                          {w.balance < 0 ? (
                            <span className="s"><span className="neg">Below zero.</span> A transfer in may be missing.</span>
                          ) : (
                            <span className="s">Opening balance {formatRupiah(w.openingBalance)}<span className="only-desktop"> · {share}% of total</span></span>
                          )}
                          {w.balance > 0 && <span className="bar-share" style={{ ["--p" as string]: share, ["--c" as string]: hue(w.color) }} />}
                        </span>
                        <span className={`fig${w.balance < 0 ? " neg" : ""}`}>{formatRupiah(w.balance)}</span>
                        <span className="row-actions">
                          <button className="icon-btn" type="button" aria-label={`Edit ${w.name}`} onClick={() => setEditing(w)}><Pencil /></button>
                          {w.deletable ? (
                            <button className="icon-btn danger" type="button" aria-label={`Delete ${w.name}`} disabled={locked(w.id)} onClick={() => act(w, "delete")}><Trash2 /></button>
                          ) : (
                            <button className="icon-btn" type="button" aria-label={`Archive ${w.name}`} disabled={locked(w.id)} onClick={() => act(w, "archive")}><Archive /></button>
                          )}
                        </span>
                      </div>
                      {refusal?.id === w.id && (
                        <div className="notice warn" role="alert">
                          <TriangleAlert />
                          <div>
                            <strong>{refusal.message}</strong>
                            <div className="actions">
                              <Link href="/transactions/new?type=transfer">Transfer the balance out</Link>
                              <Link href="/transactions/new">Record it as an expense</Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {archived.length > 0 && (
              <section aria-labelledby="arch-h">
                <div className="block block-head"><h2 id="arch-h">Archived</h2><span className="small muted">Hidden from new transactions, kept in history</span></div>
                {archived.map((w) => {
                  const { Icon } = WALLET_ICONS[w.icon] ?? WALLET_ICONS.bank!;
                  return (
                    <div className="row" key={w.id} style={{ borderTop: 0 }}>
                      <Glyph Icon={Icon} color={null} />
                      <span className="grow">
                        <span className="t">{w.name}</span>
                        <span className="s">Archived {w.archivedOn ? shortDate(w.archivedOn) : ""} · {w.transactionCount} {w.transactionCount === 1 ? "transaction" : "transactions"}</span>
                      </span>
                      <span className="fig neutral">{formatRupiah(w.balance)}</span>
                      <span className="row-actions">
                        <button className="btn quiet" type="button" disabled={locked(w.id)} onClick={() => act(w, "unarchive")}><ArchiveRestore />Unarchive</button>
                      </span>
                    </div>
                  );
                })}
              </section>
            )}
          </div>

          <WalletForm key={editing?.id ?? "new"} wallet={editing} onDone={() => { setEditing(null); router.refresh(); }} onCancel={() => setEditing(null)} />
        </div>
      </main>
    </>
  );
}

function WalletForm({ wallet, onDone, onCancel }: { wallet: Wallet | null; onDone: () => void; onCancel: () => void }) {
  const online = useOnline();
  const [name, setName] = useState(wallet?.name ?? "");
  const [opening, setOpening] = useState(wallet ? wallet.openingBalance.toLocaleString("id-ID") : "0");
  const [color, setColor] = useState(wallet?.color ?? "blue");
  const [icon, setIcon] = useState(wallet?.icon ?? "bank");
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

  const fieldError = (field: string) =>
    error?.field === field ? <span className="error" id={`w-${field}-e`}><CircleAlert />{error.message}</span> : null;

  return (
    <aside className="side" id="wallet-form" aria-labelledby="nw-h">
      <h2 id="nw-h">{wallet ? `Edit ${wallet.name}` : "New wallet"}</h2>
      <form className="form" onSubmit={submit} noValidate>
        <div className={`field${error?.field === "name" ? " invalid" : ""}`}>
          <label htmlFor="w-name">Name</label>
          <input className="input" id="w-name" placeholder="e.g. BCA, Cash, GoPay" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={error?.field === "name"} />
          {fieldError("name")}
        </div>
        <div className={`field${error?.field === "openingBalance" ? " invalid" : ""}`}>
          <label htmlFor="w-open">Opening balance</label>
          <div className="search-wrap">
            <input className="input fig" id="w-open" inputMode="numeric" value={opening} onChange={(e) => setOpening(e.target.value)} style={{ paddingLeft: 44, fontSize: 20 }} aria-describedby="w-open-h" aria-invalid={error?.field === "openingBalance"} />
            <span style={{ position: "absolute", left: 12, top: 11, fontWeight: 700, color: "var(--ink-2)" }}>Rp</span>
          </div>
          {fieldError("openingBalance")}
          <span className="hint" id="w-open-h">What the wallet held before its first recorded transaction. You can change it later and the balance follows.</span>
        </div>
        <div className="field">
          <span className="legend" id="w-col">Color</span>
          <div className="swatches" role="radiogroup" aria-labelledby="w-col">
            {WALLET_COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c[0]!.toUpperCase() + c.slice(1)} style={{ ["--c" as string]: hue(c) }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <div className="field">
          <span className="legend" id="w-ico">Icon</span>
          <div className="chips" role="radiogroup" aria-labelledby="w-ico">
            {Object.entries(WALLET_ICONS).map(([key, { Icon, label }]) => (
              <button key={key} type="button" className="chip" role="radio" aria-checked={icon === key} onClick={() => setIcon(key)}><Icon />{label}</button>
            ))}
          </div>
        </div>
        {error && !error.field && <div className="notice danger" role="alert"><CircleAlert /><div>{error.message}</div></div>}
        <button className="btn lg" type="submit" disabled={saving || !online}>{!online ? "Saving needs a connection" : wallet ? "Save changes" : "Create wallet"}</button>
        {wallet ? (
          <button className="btn quiet" type="button" onClick={onCancel}>Cancel</button>
        ) : (
          <p className="small muted">A wallet that has never been used can be deleted. Once it has transactions it can only be archived.</p>
        )}
      </form>
    </aside>
  );
}
