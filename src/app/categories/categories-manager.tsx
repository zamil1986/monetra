"use client";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CATEGORY_ICON_COMPONENTS, Glyph, categoryIcon, hue } from "@/components/icons";
import {
  Button, Field, FieldError, Notice, Page, PageHead, buttonClass, cx, h1, h2, iconButtonClass, inputClass,
  onlyMobile, rowClass, rowSub, rowTitle, rowsClass, segButtonClass, segClass, sidePanel, spacer, splitClass,
} from "@/components/ui";
import { CATEGORY_ICONS, MAX_CATEGORY_NAME, type CategoryIcon } from "@/domain/category-rules";
import { COLORS, type Color } from "@/domain/palette";
import type { CategoryType } from "@/domain/types";
import { api, ApiError } from "@/lib/api";
import { useOnline } from "@/lib/use-online";
import type { CategoryView } from "@/server/categories";

const TYPES: { value: CategoryType; label: string }[] = [
  { value: "EXPENSE", label: "Expense" },
  { value: "INCOME", label: "Income" },
];
const word = (type: CategoryType) => (type === "INCOME" ? "income" : "expense");

export function CategoriesManager({ categories }: { categories: CategoryView[] }) {
  const router = useRouter();
  const online = useOnline();
  const [type, setType] = useState<CategoryType>("EXPENSE");
  const [editing, setEditing] = useState<CategoryView | null>(null);
  const [refusal, setRefusal] = useState<{ id: string; message: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const locked = (id: string) => busy === id || !online; // changes need a connection (PRD 5.5)
  const ofType = categories.filter((c) => c.type === type);
  const active = ofType.filter((c) => !c.archived);
  const archived = ofType.filter((c) => c.archived);

  async function act(category: CategoryView, action: "archive" | "unarchive" | "delete") {
    setBusy(category.id);
    setRefusal(null);
    try {
      if (action === "delete") await api(`/api/categories/${category.id}`, { method: "DELETE" });
      else await api(`/api/categories/${category.id}/${action}`, { method: "POST" });
      if (editing?.id === category.id && action === "delete") setEditing(null);
      router.refresh();
    } catch (e) {
      setRefusal({ id: category.id, message: e instanceof ApiError ? e.message : "Something went wrong. Try again." });
    } finally {
      setBusy(null);
    }
  }

  const refusalFor = (id: string) =>
    refusal?.id === id && <Notice tone="warn" role="alert" className="my-2"><strong>{refusal.message}</strong></Notice>;

  return (
    <>
      <PageHead>
        <h1 className={h1}>Categories</h1>
        <span className={spacer} />
        <a className={buttonClass("primary", "md", onlyMobile)} href="#category-form" onClick={() => setEditing(null)}><Plus />New category</a>
      </PageHead>
      <Page>
        <div className={splitClass}>
          <div className="flex flex-col gap-8 md:gap-9">
            <div className={segClass} role="group" aria-label="Category type">
              {TYPES.map((t) => (
                <button
                  key={t.value} type="button" className={segButtonClass} aria-pressed={type === t.value}
                  onClick={() => { setType(t.value); setRefusal(null); }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <section aria-labelledby="act-h">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h2 id="act-h" className={h2}>Active</h2>
                <span className="text-meta text-ink-2">{active.length} {word(type)} {active.length === 1 ? "category" : "categories"}</span>
              </div>
              <div className={rowsClass}>
                {active.map((c) => (
                  <div key={c.id}>
                    <div className={rowClass}>
                      <Glyph Icon={categoryIcon(c.icon)} color={c.color} />
                      <span className="min-w-0 flex-1">
                        <span className={rowTitle}>{c.name}</span>
                        <span className={rowSub}>{c.deletable ? "Not used yet" : "Used in transactions"}</span>
                      </span>
                      <span className="inline-flex flex-none items-center justify-end gap-0.5">
                        <button className={iconButtonClass()} type="button" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Pencil /></button>
                        {c.deletable ? (
                          <button className={iconButtonClass(true)} type="button" aria-label={`Delete ${c.name}`} disabled={locked(c.id)} onClick={() => act(c, "delete")}><Trash2 /></button>
                        ) : (
                          <button className={iconButtonClass()} type="button" aria-label={`Archive ${c.name}`} disabled={locked(c.id)} onClick={() => act(c, "archive")}><Archive /></button>
                        )}
                      </span>
                    </div>
                    {refusalFor(c.id)}
                  </div>
                ))}
              </div>
            </section>

            {archived.length > 0 && (
              <section aria-labelledby="arch-h">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t-2 border-ink pt-3.5">
                  <h2 id="arch-h" className={h2}>Archived</h2>
                  <span className="text-meta text-ink-2">Hidden from new transactions, kept in history and filters.</span>
                </div>
                {archived.map((c) => (
                  <div key={c.id}>
                    <div className={rowClass}>
                      <Glyph Icon={categoryIcon(c.icon)} color={null} />
                      <span className="min-w-0 flex-1"><span className={rowTitle}>{c.name}</span></span>
                      <button className={iconButtonClass()} type="button" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Pencil /></button>
                      <Button variant="quiet" disabled={locked(c.id)} onClick={() => act(c, "unarchive")}><ArchiveRestore />Unarchive</Button>
                    </div>
                    {refusalFor(c.id)}
                  </div>
                ))}
              </section>
            )}
          </div>

          <CategoryForm
            key={editing?.id ?? `new-${type}`}
            category={editing}
            type={editing?.type ?? type}
            onDone={() => { setEditing(null); router.refresh(); }}
            onCancel={() => setEditing(null)}
          />
        </div>
      </Page>
    </>
  );
}

function CategoryForm({
  category, type, onDone, onCancel,
}: { category: CategoryView | null; type: CategoryType; onDone: () => void; onCancel: () => void }) {
  const online = useOnline();
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState<Color>((category?.color as Color) ?? "orange");
  const [icon, setIcon] = useState<CategoryIcon>((category?.icon as CategoryIcon) ?? "ellipsis");
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (category) await api(`/api/categories/${category.id}`, { method: "PATCH", body: { name, color, icon } });
      else await api("/api/categories", { method: "POST", body: { type, name, color, icon } });
      if (!category) setName("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? { field: err.field, message: err.message } : { message: "Something went wrong. Try again." });
    } finally {
      setSaving(false);
    }
  }

  const errorFor = (field: string) => (error?.field === field ? error.message : null);

  return (
    <aside className={sidePanel} id="category-form" aria-labelledby="nc-h">
      <h2 id="nc-h" className={cx(h2, "mb-4")}>{category ? `Edit ${category.name}` : `New ${word(type)} category`}</h2>
      <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
        <Field label="Name" htmlFor="c-name" error={errorFor("name")}>
          <input
            className={inputClass(!!errorFor("name"))} id="c-name" placeholder={type === "INCOME" ? "e.g. Bonus" : "e.g. Kopi"}
            maxLength={MAX_CATEGORY_NAME} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errorFor("name")}
          />
        </Field>
        <Field label="Color" legendId="c-col" error={errorFor("color")}>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="c-col">
            {COLORS.map((c) => (
              <button
                key={c} type="button" role="radio" aria-checked={color === c} aria-label={c[0]!.toUpperCase() + c.slice(1)}
                className="size-8 cursor-pointer rounded border-2 border-white bg-(--c) outline-1 outline-line aria-checked:outline-2 aria-checked:outline-ink"
                style={{ ["--c" as string]: hue(c) }} onClick={() => setColor(c)}
              />
            ))}
          </div>
        </Field>
        <Field label="Icon" legendId="c-ico" error={errorFor("icon")}>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="c-ico">
            {CATEGORY_ICONS.map((key) => {
              const Icon = CATEGORY_ICON_COMPONENTS[key];
              return (
                <button
                  key={key} type="button" role="radio" aria-checked={icon === key} aria-label={key.replace(/-\d+$/, "").replace(/-/g, " ")}
                  className="inline-grid size-10 cursor-pointer place-items-center rounded border border-line bg-white text-ink-2 aria-checked:border-ink aria-checked:bg-ink aria-checked:text-white [&_svg]:size-[18px]"
                  onClick={() => setIcon(key)}
                >
                  <Icon />
                </button>
              );
            })}
          </div>
        </Field>
        {error && !error.field && <FieldError message={error.message} />}
        <Button type="submit" size="lg" disabled={saving || !online}>
          {!online ? "Saving needs a connection" : category ? "Save changes" : "Create category"}
        </Button>
        {category ? (
          <Button variant="quiet" onClick={onCancel}>Cancel</Button>
        ) : (
          <p className="text-meta text-ink-2">A category no transaction uses can be deleted. Once a transaction uses it, it can only be archived.</p>
        )}
      </form>
    </aside>
  );
}
