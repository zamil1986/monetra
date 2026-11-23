"use client";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { useT } from "@/lib/i18n-client";
import { TONES, cx } from "./ui";

/**
 * A refusal that drops in at the top of the page instead of pushing the list apart: the Arsip that was
 * turned down, with what to do about it. It stays until closed, one of its links is followed, or the page
 * is left, because the way out it offers must not vanish before it is read. Success stays in the toast.
 */
export function TopAlert({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) {
  const { t } = useT();
  const { state } = useSidebar();
  // Leaving closes it. The Add sheet opens over this page without unmounting it, so watch the path.
  const path = usePathname();
  const openedOn = useRef(path);
  useEffect(() => {
    if (path !== openedOn.current) onDismiss();
  }, [path, onDismiss]);
  const { box, Icon } = TONES.warn;
  // Desktop centers it over the content column, past the cobalt rail however wide the rail is now.
  const rail = state === "collapsed" ? "var(--sidebar-width-icon)" : "var(--sidebar-width)";
  return (
    // Phone: just under the 52px cobalt band. Desktop: near the top of the window.
    <div
      style={{ "--rail": rail } as CSSProperties}
      className="pointer-events-none fixed inset-x-4 top-[calc(52px+env(safe-area-inset-top)+8px)] z-[60] flex justify-center md:top-4 md:left-[calc(var(--rail)+16px)]"
    >
      <div
        role="alert"
        className={cx(
          "pointer-events-auto flex w-full max-w-[560px] animate-drop items-start gap-2.5 rounded border py-1.5 pr-1 pl-3.5 text-sm shadow-[0_12px_32px_-12px_rgba(20,22,26,0.4)] motion-reduce:animate-none [&_a]:text-inherit",
          box,
        )}
      >
        {Icon && <Icon className="mt-[13px] shrink-0" />}
        <div className="min-w-0 flex-1 py-2.5">{children}</div>
        <button
          type="button"
          aria-label={t("toast.dismiss")}
          onClick={onDismiss}
          className="grid size-11 shrink-0 place-items-center opacity-80 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current [&_svg]:size-[18px]"
        >
          <X />
        </button>
      </div>
    </div>
  );
}
