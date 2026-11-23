"use client";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ConfirmDelete } from "@/components/confirm-delete";
import { FormDialog } from "@/components/form-dialog";
import { CATEGORY_ICON_COMPONENTS, Glyph, categoryIcon, hue } from "@/components/icons";
import { useToast } from "@/components/toast";
import { TopAlert } from "@/components/top-alert";
import {
  Button, Field, FieldError, Page, PageHead, cx, h1, h2, iconButtonClass, inputClass,
  rowClass, rowSub, rowTitle, rowsClass, segButtonClass, segClass, spacer,
} from "@/components/ui";
import { CATEGORY_ICONS, MAX_CATEGORY_NAME, type CategoryIcon } from "@/domain/category-rules";
import { COLORS, type Color } from "@/domain/palette";
import type { CategoryType } from "@/domain/types";
import { api, ApiError } from "@/lib/api";
import { longDate } from "@/lib/dates";
import { useT } from "@/lib/i18n-client";
import { useOnline } from "@/lib/use-online";
import type { CategoryView } from "@/server/categories";

const TYPES: CategoryType[] = ["EXPENSE", "INCOME"];

/** A Kategori as the screen shows it: its last use is already a date in the Pengguna's zone. */
export type CategoryRow = Omit<CategoryView, "lastUsedAt"> & { lastUsedOn: string | null };

/*
 * From the `wide` breakpoint the list lays out as columns: one grid for the whole page, which every
 * section, the column heads and each row join through subgrid, so the columns line up across the
 * active and archived rows even though Edit plus Unarchive is wider than the icon pair. Below it,
 * each row is the stacked one the phone shows.
 */
const wideGrid =
  "wide:grid wide:max-w-none wide:grid-cols-[minmax(200px,1fr)_minmax(200px,1.6fr)_auto_auto] wide:gap-x-6 wide:gap-y-9";
const sub = "wide:col-span-full wide:grid wide:grid-cols-subgrid";
const full = "wide:col-span-full";
const headRow = "hidden py-2 text-meta font-semibold text-ink-2";
const wideCell = "hidden wide:flex";

/** How often a Kategori is used: a bar against the most-used one and the count, or "not used yet". */
function Usage({ category, most }: { category: CategoryRow; most: number }) {
  const { t } = useT();
  const count = category.transactionCount;
  if (count === 0) return <span className={cx(wideCell, "items-center text-meta text-ink-2")}>{t("categories.notUsed")}</span>;
  return (
    <span className={cx(wideCell, "items-center gap-3")}>
      <span className="h-1.5 min-w-0 flex-1 bg-panel">
        <span
          className={cx("block h-1.5 w-[calc(var(--p)*1%)] min-w-[3px]", category.archived ? "bg-ink-2" : "bg-(--c)")}
          style={{ ["--p" as string]: Math.round((count / most) * 100), ["--c" as string]: hue(category.color) }}
        />
      </span>
      <span className="min-w-[4ch] text-right text-meta tabular-nums">
        <span aria-hidden>{count}</span><span className="sr-only">{t("tx.count", { count })}</span>
      </span>
    </span>
  );
}

function LastUsed({ category }: { category: CategoryRow }) {
  const { t, lang } = useT();
  return (
    <span className={cx(wideCell, "items-center text-meta text-ink-2")}>
      <span className="sr-only">{t("categories.col.lastUsed")} </span>
      {category.lastUsedOn ? longDate(category.lastUsedOn, lang) : <span aria-label={t("categories.notUsed")}>–</span>}
    </span>
  );
}

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const online = useOnline();
  const toast = useToast();
  const { t } = useT();
  const [type, setType] = useState<CategoryType>("EXPENSE");
  // Open and target are apart so the title and fields stay put while the dialog animates out.
  const [formOpen, setFormOpen] = useState(false);
  const [target, setTarget] = useState<CategoryRow | null>(null);
  const [formKey, setFormKey] = useState(0);
  // `key` restarts the drop-in when a second refusal replaces the first.
  const [refusal, setRefusal] = useState<{ id: string; message: string; key: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const locked = (id: string) => busy === id || !online; // changes need a connection (PRD 5.5)
  const ofType = categories.filter((c) => c.type === type);
  const active = ofType.filter((c) => !c.archived);
  const archived = ofType.filter((c) => c.archived);
  /** The usage bars are measured against the most-used Kategori of the type on show. */
  const most = Math.max(1, ...ofType.map((c) => c.transactionCount));
  /** A new Kategori takes the type of the tab it was opened from. */
  const formType = target?.type ?? type;

  /** Each opening starts from a fresh form: New after an edit is always empty. */
  function openForm(category: CategoryRow | null) {
    setTarget(category);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  async function act(category: CategoryRow, action: "archive" | "unarchive") {
    setBusy(category.id);
    setRefusal(null);
    try {
      await api(`/api/categories/${category.id}/${action}`, { method: "POST" });
      router.refresh();
    } catch (e) {
      setRefusal({ id: category.id, message: e instanceof ApiError ? e.message : t("common.somethingWrong"), key: Date.now() });
    } finally {
      setBusy(null);
    }
  }

  /** Delete, after the confirmation: the error is shown in the dialog, the outcome in a toast. */
  async function remove(category: CategoryRow) {
    try {
      await api(`/api/categories/${category.id}`, { method: "DELETE" });
      toast({ message: t("categories.deleted", { name: category.name }) });
      router.refresh();
      return null;
    } catch (e) {
      return e instanceof ApiError ? e.message : t("common.somethingWrong");
    }
  }

  return (
    <>
      <PageHead>
        <h1 className={h1}>{t("nav.categories")}</h1>
        <span className={spacer} />
        <Button onClick={() => openForm(null)}><Plus />{t("categories.new")}</Button>
      </PageHead>
      <Page>
        <div className={cx("flex max-w-[760px] flex-col gap-8 md:gap-9", wideGrid)}>
          <div className={cx(segClass, full, "wide:max-w-[420px]")} role="group" aria-label={t("categories.typeGroup")}>
            {TYPES.map((value) => (
              <button
                key={value} type="button" className={segButtonClass} aria-pressed={type === value}
                onClick={() => { setType(value); setRefusal(null); }}
              >
                {t(`type.${value}`)}
              </button>
            ))}
          </div>

          <section aria-labelledby="act-h" className={sub}>
            <div className={cx("mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5", full)}>
              <h2 id="act-h" className={h2}>{t("categories.active")}</h2>
              <span className="text-meta text-ink-2">{t(`categories.count${type}`, { count: active.length })}</span>
            </div>
            {/* The column heads exist only where the rows lay out as columns. */}
            <div aria-hidden className={cx(sub, headRow)}>
              <span>{t("common.category")}</span>
              <span>{t("categories.col.usage")}</span>
              <span>{t("categories.col.lastUsed")}</span>
              <span />
            </div>
            <div className={cx(rowsClass, sub)}>
              {active.map((c) => (
                <div key={c.id} className={cx(rowClass, sub, "wide:gap-x-6")}>
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <Glyph Icon={categoryIcon(c.icon)} color={c.color} />
                    <span className="min-w-0 flex-1">
                      <span className={rowTitle}>{c.name}</span>
                      <span className={cx(rowSub, "wide:hidden")}>{c.deletable ? t("categories.notUsed") : t("categories.used")}</span>
                    </span>
                  </span>
                  <Usage category={c} most={most} />
                  <LastUsed category={c} />
                  <span className="inline-flex flex-none items-center justify-end gap-0.5">
                    <button className={iconButtonClass()} type="button" aria-label={t("common.edit", { name: c.name })} onClick={() => openForm(c)}><Pencil /></button>
                    {c.deletable ? (
                      <ConfirmDelete
                        title={t("categories.del.title")}
                        body={t("categories.del.body")}
                        item={{ title: c.name, meta: t(`type.${c.type}`) }}
                        confirmLabel={t("categories.del.confirm")}
                        onConfirm={() => remove(c)}
                        trigger={(open) => (
                          <button className={iconButtonClass(true)} type="button" aria-label={t("common.delete", { name: c.name })} disabled={locked(c.id)} onClick={open}><Trash2 /></button>
                        )}
                      />
                    ) : (
                      <button className={iconButtonClass()} type="button" aria-label={t("common.archive", { name: c.name })} disabled={locked(c.id)} onClick={() => act(c, "archive")}><Archive /></button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {archived.length > 0 && (
            <section aria-labelledby="arch-h" className={sub}>
              <div className={cx("mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t-2 border-ink pt-3.5", full)}>
                <h2 id="arch-h" className={h2}>{t("common.archived")}</h2>
                <span className="text-meta text-ink-2">{t("categories.archivedNote")}</span>
              </div>
              {archived.map((c) => (
                <div key={c.id} className={cx(rowClass, sub, "wide:gap-x-6")}>
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <Glyph Icon={categoryIcon(c.icon)} color={null} />
                    <span className="min-w-0 flex-1"><span className={rowTitle}>{c.name}</span></span>
                  </span>
                  <Usage category={c} most={most} />
                  <LastUsed category={c} />
                  <span className="flex items-center justify-end gap-0.5">
                    <button className={iconButtonClass()} type="button" aria-label={t("common.edit", { name: c.name })} onClick={() => openForm(c)}><Pencil /></button>
                    <Button variant="quiet" disabled={locked(c.id)} onClick={() => act(c, "unarchive")}><ArchiveRestore />{t("common.unarchive")}</Button>
                  </span>
                </div>
              ))}
            </section>
          )}
        </div>
      </Page>
      {refusal && (
        <TopAlert key={refusal.key} onDismiss={() => setRefusal(null)}>
          <strong>{refusal.message}</strong>
        </TopAlert>
      )}
      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={target ? t("common.edit", { name: target.name }) : t(`categories.new${formType}`)}
        initialFocusId="c-name"
      >
        <CategoryForm
          key={formKey}
          category={target}
          type={formType}
          onDone={(name) => {
            setFormOpen(false);
            toast({ message: t(target ? "categories.saved" : "categories.created", { name }) });
            router.refresh();
          }}
          onCancel={() => setFormOpen(false)}
        />
      </FormDialog>
    </>
  );
}

function CategoryForm({
  category, type, onDone, onCancel,
}: { category: CategoryRow | null; type: CategoryType; onDone: (name: string) => void; onCancel: () => void }) {
  const online = useOnline();
  const { t } = useT();
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
      onDone(name.trim());
    } catch (err) {
      setError(err instanceof ApiError ? { field: err.field, message: err.message } : { message: t("common.somethingWrong") });
    } finally {
      setSaving(false);
    }
  }

  const errorFor = (field: string) => (error?.field === field ? error.message : null);

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <Field label={t("common.name")} htmlFor="c-name" error={errorFor("name")}>
        <input
          className={inputClass(!!errorFor("name"))} id="c-name" placeholder={t(`categories.placeholder${type}`)}
          maxLength={MAX_CATEGORY_NAME} value={name} onChange={(e) => { if (error?.field === "name") setError(null); setName(e.target.value); }} aria-invalid={!!errorFor("name")}
        />
      </Field>
      <Field label={t("common.color")} legendId="c-col" error={errorFor("color")}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="c-col">
          {COLORS.map((c) => (
            <button
              key={c} type="button" role="radio" aria-checked={color === c} aria-label={t(`color.${c}`)}
              className="size-8 cursor-pointer rounded border-2 border-surface bg-(--c) outline-1 outline-line aria-checked:outline-2 aria-checked:outline-ink"
              style={{ ["--c" as string]: hue(c) }} onClick={() => setColor(c)}
            />
          ))}
        </div>
      </Field>
      <Field label={t("common.icon")} legendId="c-ico" error={errorFor("icon")}>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="c-ico">
          {CATEGORY_ICONS.map((key) => {
            const Icon = CATEGORY_ICON_COMPONENTS[key];
            return (
              <button
                key={key} type="button" role="radio" aria-checked={icon === key} aria-label={t(`categoryIcon.${key}`)}
                className="inline-grid size-10 cursor-pointer place-items-center rounded border border-line bg-surface text-ink-2 aria-checked:border-ink aria-checked:bg-ink aria-checked:text-paper [&_svg]:size-[18px]"
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
        {!online ? t("common.savingNeedsConnection") : category ? t("common.saveChanges") : t("categories.create")}
      </Button>
      <Button variant="quiet" onClick={onCancel}>{t("common.cancel")}</Button>
      {!category && <p className="text-meta text-ink-2">{t("categories.deleteNote")}</p>}
    </form>
  );
}
