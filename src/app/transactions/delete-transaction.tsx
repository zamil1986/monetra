"use client";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useToast } from "@/components/toast";
import { Button, iconButtonClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n-client";

type Props = { id: string; title: string; meta: string; amount: string; variant?: "icon" | "button"; after?: string };

/** PRD 3.4 rule 10: deleting always goes through a confirmation dialog. */
export function DeleteTransactionButton({ id, title, meta, amount, variant = "icon", after }: Props) {
  const router = useRouter();
  const toast = useToast();
  const { t } = useT();

  async function remove() {
    try {
      try {
        await api(`/api/transactions/${id}`, { method: "DELETE" });
      } catch (e) {
        // A repeat of a delete that already went through: it's gone, which is what was asked.
        if (!(e instanceof ApiError && e.status === 404)) throw e;
      }
      haptic();
      toast({ message: t("toast.deleted"), detail: `${title} · ${amount}` });
      if (after) router.push(after);
      router.refresh();
      return null;
    } catch (e) {
      return e instanceof ApiError ? e.message : t("del.failed");
    }
  }

  return (
    <ConfirmDelete
      title={t("del.title")}
      body={t("del.body")}
      item={{ title, meta, aside: amount }}
      confirmLabel={t("del.confirm")}
      onConfirm={remove}
      trigger={(open) =>
        variant === "icon" ? (
          <>
            <Link className={iconButtonClass()} href={`/transactions/${id}`} aria-label={t("common.edit", { name: title })}><Pencil /></Link>
            <button className={iconButtonClass(true)} type="button" aria-label={t("common.delete", { name: title })} onClick={open}><Trash2 /></button>
          </>
        ) : (
          <Button variant="danger" onClick={open}><Trash2 />{t("del.button")}</Button>
        )
      }
    />
  );
}
