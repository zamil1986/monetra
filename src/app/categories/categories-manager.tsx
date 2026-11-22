"use client";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ConfirmDelete } from "@/components/confirm-delete";
import { CATEGORY_ICON_COMPONENTS, Glyph, categoryIcon, hue } from "@/components/icons";
import { useToast } from "@/components/toast";
import {
  Button, Field, FieldError, Notice, Page, PageHead, buttonClass, cx, h1, h2, iconButtonClass, inputClass,
  onlyMobile, rowClass, rowSub, rowTitle, rowsClass, segButtonClass, segClass, sidePanel, spacer, splitClass,
} from "@/components/ui";
import { CATEGORY_ICONS, MAX_CATEGORY_NAME, type CategoryIcon } from "@/domain/category-rules";
import { COLORS, type Color } from "@/domain/palette";
import type { CategoryType } from "@/domain/types";
import { api, ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n-client";
import { useOnline } from "@/lib/use-online";
import type { CategoryView } from "@/server/categories";

const TYPES: CategoryType[] = ["EXPENSE", "INCOME"];

export function CategoriesManager({ categories }: { categories: CategoryView[] }) {
  const router = useRouter();
  const online = useOnline();
  const toast = useToast();
  const { t } = useT();
  const [type, setType] = useState<CategoryType>("EXPENSE");
  const [editing, setEditing] = useState<CategoryView | null>(null);
  const [refusal, setRefusal] = useState<{ id: string; message: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const locked = (id: string) => busy === id || !online; // changes need a connection (PRD 5.5)
  const ofType = categories.filter((c) => c.type === type);
  const active = ofType.filter((c) => !c.archived);
  const archived = ofType.filter((c) => c.archived);

  async function act(category: CategoryView, action: "archive" | "unarchive") {
    setBusy(category.id);
    setRefusal(null);
    try {
      await api(`/api/categories/${category.id}/${action}`, { method: "POST" });
      router.refresh();
    } catch (e) {
      setRefusal({ id: category.id, message: e instanceof ApiError ? e.message : t("common.somethingWrong") });
    } finally {
      setBusy(null);
    }
  }

  /** Delete, after the confirmation: the error is shown in the dialog, the outcome in a toast. */
  async function remove(category: CategoryView) {
    try {
      await api(`/api/categories/${category.id}`, { method: "DELETE" });
      if (editing?.id === category.id) setEditing(null);
      toast({ message: t("categories.deleted", { name: category.name }) });
      router.refresh();
      return null;
    } catch (e) {
      return e instanceof ApiError ? e.message : t("common.somethingWrong");
    }
  }

  const refusalFor = (id: string) =>
    refusal?.id === id && <Notice tone="warn" role="alert" className="my-2"><strong>{refusal.message}</strong></Notice>;

  return (
    <>
      <PageHead>
        <h1 className={h1}>{t("nav.categories")}</h1>
        <span className={spacer} />
        <a className={buttonClass("primary", "md", onlyMobile)} href="#category-form" onClick={() => setEditing(null)}><Plus />{t("categories.new")}</a>
      </PageHead>
      <Page>
        <div className={splitClass}>
          <div className="flex flex-col gap-8 md:gap-9">
            <div className={segClass} role="group" aria-label={t("categories.typeGroup")}>
              {TYPES.map((value) => (
                <button
                  key={value} type="button" className={segButtonClass} aria-pressed={type === value}
                  onClick={() => { setType(value); setRefusal(null); }}
                >
                  {t(`type.${value}`)}
                </button>
              ))}
            </div>

            <section aria-labelledby="act-h">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h2 id="act-h" className={h2}>{t("categories.active")}</h2>
                <span className="text-meta text-ink-2">{t(`categories.count${type}`, { count: active.length })}</span>
              </div>
              <div className={rowsClass}>
                {active.map((c) => (
                  <div key={c.id}>
                    <div className={rowClass}>
                      <Glyph Icon={categoryIcon(c.icon)} color={c.color} />
                      <span className="min-w-0 flex-1">
                        <span className={rowTitle}>{c.name}</span>
                        <span className={rowSub}>{c.deletable ? t("categories.notUsed") : t("categories.used")}</span>
                      </span>
                      <span className="inline-flex flex-none items-center justify-end gap-0.5">
                        <button className={iconButtonClass()} type="button" aria-label={t("common.edit", { name: c.name })} onClick={() => setEditing(c)}><Pencil /></button>
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
                    {refusalFor(c.id)}
                  </div>
                ))}
              </div>
            </section>

            {archived.length > 0 && (
              <section aria-labelledby="arch-h">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t-2 border-ink pt-3.5">
                  <h2 id="arch-h" className={h2}>{t("common.archived")}</h2>
                  <span className="text-meta text-ink-2">{t("categories.archivedNote")}</span>
                </div>
                {archived.map((c) => (
                  <div key={c.id}>
                    <div className={rowClass}>
                      <Glyph Icon={categoryIcon(c.icon)} color={null} />
                      <span className="min-w-0 flex-1"><span className={rowTitle}>{c.name}</span></span>
                      <button className={iconButtonClass()} type="button" aria-label={t("common.edit", { name: c.name })} onClick={() => setEditing(c)}><Pencil /></button>
                      <Button variant="quiet" disabled={locked(c.id)} onClick={() => act(c, "unarchive")}><ArchiveRestore />{t("common.unarchive")}</Button>
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
      if (!category) setName("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? { field: err.field, message: err.message } : { message: t("common.somethingWrong") });
    } finally {
      setSaving(false);
    }
  }

  const errorFor = (field: string) => (error?.field === field ? error.message : null);

  return (
    <aside className={sidePanel} id="category-form" aria-labelledby="nc-h">
      <h2 id="nc-h" className={cx(h2, "mb-4")}>{category ? t("common.edit", { name: category.name }) : t(`categories.new${type}`)}</h2>
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
        {category ? (
          <Button variant="quiet" onClick={onCancel}>{t("common.cancel")}</Button>
        ) : (
          <p className="text-meta text-ink-2">{t("categories.deleteNote")}</p>
        )}
      </form>
    </aside>
  );
}
