"use client";
import { Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Field, cx, inputClass, onlyMobile } from "@/components/ui";

type Option = { id: string; name: string; archived: boolean };
type Values = Record<string, string | number | undefined>;

/** Every filter lives in the URL, so a filtered view can be reloaded or opened on the other device. */
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

  const select = (key: string) => ({
    value: String(values[key] ?? ""),
    onChange: (e: { target: { value: string } }) => apply(key, e.target.value),
    className: inputClass(),
  });
  const group = (type: string) => categories.filter((c) => c.type === type && !c.archived);
  // Archived Kategori still label old Transaksi, so they stay filterable in a group of their own (PRD 3.6).
  const archivedCategories = categories.filter((c) => c.archived);
  // Desktop: every field sits in one wrapping row. Phone: the extra fields fold behind the Filters button.
  const item = "flex-[1_1_118px] max-md:basis-[40%]";

  return (
    <form className="mb-4 flex flex-wrap items-end gap-2.5" role="search" aria-label="Find transactions" onSubmit={(e) => e.preventDefault()}>
      <Field label="Search description" htmlFor="q" className="flex-[2_1_200px]">
        <div className="relative">
          <Search className="absolute top-[13px] left-3 text-ink-3" />
          <input className={inputClass(false, "pl-[38px]")} id="q" type="search" placeholder="e.g. groceries" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Field>
      <Button variant="secondary" className={onlyMobile} aria-expanded={open} aria-controls="filters" onClick={() => setOpen(!open)}>
        <SlidersHorizontal />Filters{active ? ` · ${active}` : ""}
      </Button>
      <div id="filters" className={cx(open ? "flex" : "hidden", "basis-full flex-wrap gap-2.5 md:contents")}>
        <Field label="Type" htmlFor="f-type" className={item}>
          <select id="f-type" {...select("type")}>
            <option value="">All types</option><option value="INCOME">Income</option><option value="EXPENSE">Expense</option><option value="TRANSFER">Transfer</option>
          </select>
        </Field>
        <Field label="Category" htmlFor="f-cat" className={item}>
          <select id="f-cat" {...select("categoryId")}>
            <option value="">All categories</option>
            {["EXPENSE", "INCOME"].map((type) => (
              <optgroup key={type} label={type === "EXPENSE" ? "Expense" : "Income"}>
                {group(type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
            {archivedCategories.length > 0 && (
              <optgroup label="Archived">
                {archivedCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type === "INCOME" ? "income" : "expense"})</option>
                ))}
              </optgroup>
            )}
          </select>
        </Field>
        <Field label="Wallet" htmlFor="f-wal" className={item}>
          <select id="f-wal" {...select("walletId")}>
            <option value="">All wallets</option>
            {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}{w.archived ? " (archived)" : ""}</option>)}
          </select>
        </Field>
        <Field label="From" htmlFor="f-from" className={cx(item, "md:flex-[1_1_146px]")}><input id="f-from" type="date" {...select("from")} /></Field>
        <Field label="To" htmlFor="f-to" className={cx(item, "md:flex-[1_1_146px]")}><input id="f-to" type="date" {...select("to")} /></Field>
        <Field label="Sort by" htmlFor="f-sort" className={item}>
          <select id="f-sort" {...select("sort")}>
            <option value="">Newest first</option><option value="oldest">Oldest first</option><option value="amount_desc">Highest amount</option><option value="amount_asc">Lowest amount</option>
          </select>
        </Field>
      </div>
    </form>
  );
}
