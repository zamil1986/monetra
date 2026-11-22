"use client";
import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, Page, PageHead, buttonClass, h1 } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

/** A screen that failed to render: say what happened, that saved money is safe, and how to recover. */
export default function ScreenError({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useT();
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  useEffect(() => console.error(error), [error]);

  return (
    <>
      <PageHead><h1 className={h1}>{t("errorPage.title")}</h1></PageHead>
      <Page>
        <div role="alert" className="max-w-[560px] border-t-2 border-ink pt-4">
          <p className="text-[17px]">{t("errorPage.body")}</p>
          {digest && <p className="mt-2 text-meta text-ink-3">{t("errorPage.ref", { digest })}</p>}
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button size="lg" onClick={() => retry()}><RotateCw />{t("errorPage.retry")}</Button>
            <Link className={buttonClass("secondary", "lg")} href="/dashboard">{t("errorPage.home")}</Link>
          </div>
        </div>
      </Page>
    </>
  );
}
