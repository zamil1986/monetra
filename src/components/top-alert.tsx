"use client";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { useT } from "@/lib/i18n-client";
import { TONES, cx } from "./ui";

/** How long a TopAlert stays on screen; the Android app uses the same (mobile/lib/ui/widgets.dart). */
export const TOP_ALERT_MS = 8000;

/**
 * A refusal that drops in at the top of the page instead of pushing the list apart: the Arsip that was
 * turned down, with what to do about it. It goes by itself after TOP_ALERT_MS, or sooner when closed,
 * when one of its links is followed, or when the page is left. Success stays in the toast.
 */
export function TopAlert({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) {
  const { t } = useT();
  const { state } = useSidebar();
  // The latest callback, so a parent re-render (router.refresh) doesn't restart the countdown.
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });
  // Leaving closes it. The Add sheet opens over this page without unmounting it, so watch the path.
  const path = usePathname();
  const openedOn = useRef(path);
  useEffect(() => {
    if (path !== openedOn.current) dismiss.current();
  }, [path]);
  // The countdown waits while the pointer or keyboard focus is on it, so a link can still be reached.
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (held) return;
    const timer = setTimeout(() => dismiss.current(), TOP_ALERT_MS);
    return () => clearTimeout(timer);
  }, [held]);
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
        onPointerEnter={() => setHeld(true)}
        onPointerLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false); }}
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
