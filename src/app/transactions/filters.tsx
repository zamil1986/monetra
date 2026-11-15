"use client";
import { Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Option = { id: string; name: string; archived: boolean };
type Values = Record<string, string | number | undefined>;

/** Every filter lives in the URL, so a filtered view can be reloaded or shared between devices. */
export function Filters({ values, wallets, categories }: { values: Values; wallets: Option[]; categories: (Option & { type: string })[] }) {
  const router = useRouter();
  const path = usePathname();
  const [search, setSearch] = useState(String(values.search ?? ""));
  const [open, setOpen] = useState(false);
  const active = ["type", "categoryId", "walletId", "from", "to", "sort"].filter((k) => values[k]).length;

  const apply = (key: string, value: string) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...values, [key]: value })) if (v && k !== "page") params.set(k, String(v));
    router.replace(params.size ? `${path}?${params}` : path);
  };

  useEffect(() => {
    if (search === String(values.search ?? "")) return;
    const t = setTimeout(() => apply("search", search), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const select = (key: string) => ({ value: String(values[key] ?? ""), onChange: (e: { target: { value: string } }) => apply(key, e.target.value) });
  const group = (type: string) => categories.filter((c) => c.type === type);

  return (
    <form className="toolbar" role="search" aria-label="Find transactions" onSubmit={(e) => e.preventDefault()}>
      <div className="field search">
        <label htmlFor="q">Search description</label>
        <div className="search-wrap"><Search /><input className="input" id="q" type="search" placeholder="e.g. groceries" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      <button className="btn secondary only-mobile" type="button" aria-expanded={open} aria-controls="filters" onClick={() => setOpen(!open)}>
        <SlidersHorizontal />Filters{active ? ` · ${active}` : ""}
      </button>
      <div className="filters" id="filters" hidden={!open}>
        <div className="field"><label htmlFor="f-type">Type</label>
          <select className="input" id="f-type" {...select("type")}>
            <option value="">All types</option><option value="INCOME">Income</option><option value="EXPENSE">Expense</option><option value="TRANSFER">Transfer</option>
          </select></div>
        <div className="field"><label htmlFor="f-cat">Category</label>
          <select className="input" id="f-cat" {...select("categoryId")}>
            <option value="">All categories</option>
            {["EXPENSE", "INCOME"].map((type) => (
              <optgroup key={type} label={type === "EXPENSE" ? "Expense" : "Income"}>
                {group(type).map((c) => <option key={c.id} value={c.id}>{c.name}{c.archived ? " (archived)" : ""}</option>)}
              </optgroup>
            ))}
          </select></div>
        <div className="field"><label htmlFor="f-wal">Wallet</label>
          <select className="input" id="f-wal" {...select("walletId")}>
            <option value="">All wallets</option>
            {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}{w.archived ? " (archived)" : ""}</option>)}
          </select></div>
        <div className="field"><label htmlFor="f-from">From</label><input className="input" id="f-from" type="date" {...select("from")} /></div>
        <div className="field"><label htmlFor="f-to">To</label><input className="input" id="f-to" type="date" {...select("to")} /></div>
        <div className="field"><label htmlFor="f-sort">Sort by</label>
          <select className="input" id="f-sort" {...select("sort")}>
            <option value="">Newest first</option><option value="oldest">Oldest first</option><option value="amount_desc">Highest amount</option><option value="amount_asc">Lowest amount</option>
          </select></div>
      </div>
    </form>
  );
}
