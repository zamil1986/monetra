"use client";
import { Page, PageHead, cx, rowsClass } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

const bone = "animate-pulse bg-panel motion-reduce:animate-none";

/**
 * Shown the moment a screen is asked for, while its figures come from the server: the page head, one big
 * figure and a sheet of hairline rows, so the screen keeps its shape instead of freezing on the last one.
 * A Client Component, so the fallback needs no request data and can show instantly. Each app route
 * re-exports it as its loading.tsx; the sign-in pages keep their own look and have none.
 */
/** `wide`: for screens whose list spans the page from the `wide` breakpoint, so it doesn't jump on load. */
export function ScreenSkeleton({ wide = false }: { wide?: boolean }) {
  const { t } = useT();
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{t("loading.label")}</span>
      <PageHead><span aria-hidden className={cx(bone, "h-7 w-40")} /></PageHead>
      <Page>
        <div aria-hidden className={cx("flex max-w-[720px] flex-col", wide && "wide:max-w-none")}>
          <span className={cx(bone, "h-4 w-28")} />
          <span className={cx(bone, "mt-3 h-12 w-72 md:h-14")} />
          <div className={cx(rowsClass, "mt-8")}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 border-b border-line py-3">
                <span className={cx(bone, "size-9 shrink-0 rounded-[4px]")} />
                <span className="flex flex-1 flex-col gap-1.5">
                  <span className={cx(bone, "h-4", i % 2 ? "w-36" : "w-48")} />
                  <span className={cx(bone, "h-3 w-24")} />
                </span>
                <span className={cx(bone, "h-5 w-20")} />
              </div>
            ))}
          </div>
        </div>
      </Page>
    </div>
  );
}
