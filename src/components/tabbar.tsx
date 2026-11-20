"use client";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type TabbarItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** The page this tab points at is the current one. */
  active?: boolean;
  /** The raised yellow action in the middle (Add transaction). Never shows the indicator. */
  primary?: boolean;
  /** Accessible name when the visible label is too short, e.g. "Add" → "Add transaction". */
  ariaLabel?: string;
  /** Small count on the icon. Hidden at 0; shows "99+" above 99. */
  badge?: number;
};

/**
 * Phone bottom navigation: equal columns, a cobalt indicator that slides to the active tab,
 * optional numeric badges, and a raised primary action. Hidden from the md breakpoint up,
 * where the sidebar takes over.
 */
export function Tabbar({
  items,
  className,
  "aria-label": ariaLabel = "Main",
  badgeSuffix = " new",
}: {
  items: TabbarItem[];
  className?: string;
  "aria-label"?: string;
  /** Read after a badge's count by screen readers, in the page's Bahasa. */
  badgeSuffix?: string;
}) {
  const activeIndex = items.findIndex((item) => item.active && !item.primary);

  return (
    <nav
      aria-label={ariaLabel}
      style={{ "--tabs": items.length, "--active": Math.max(activeIndex, 0) } as CSSProperties}
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 grid grid-cols-[repeat(var(--tabs),minmax(0,1fr))] border-t-2 border-ink bg-paper px-1 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] md:hidden",
        className,
      )}
    >
      {/* Sliding indicator: one column wide, sitting on the top rule, moved by the active index. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-[2px] left-1 h-[3px] w-[calc((100%-0.5rem)/var(--tabs))] transition-[translate,opacity] duration-300 ease-out-expo",
          activeIndex < 0 && "opacity-0",
        )}
        style={{ translate: "calc(100% * var(--active)) 0" }}
      >
        <span className="mx-auto block h-full w-10 rounded-b-sm bg-cobalt-ink" />
      </span>

      {items.map(({ href, label, Icon, active, primary, ariaLabel: itemLabel, badge }) => (
        <Link
          key={href}
          href={href}
          aria-label={itemLabel}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-h-12 flex-col items-center gap-0.5 rounded py-[5px] text-[11.5px] font-semibold no-underline [&_svg]:size-[22px]!",
            primary ? "text-ink" : "text-ink-2 transition-colors duration-150 aria-[current=page]:text-cobalt-ink",
          )}
        >
          <span
            className={cn(
              "relative grid place-items-center",
              primary && "-mt-[18px] h-11 w-[52px] rounded-xl border-2 border-on-yellow bg-yellow text-on-yellow transition-transform duration-150 ease-out-expo active:scale-95",
            )}
          >
            <Icon />
            {!!badge && badge > 0 && (
              <span className="fig absolute -top-1.5 left-[calc(100%-8px)] min-w-[18px] rounded-full border-2 border-paper bg-red px-1 text-center text-[11px] leading-[14px] text-paper">
                {badge > 99 ? "99+" : badge}
                <span className="sr-only">{badgeSuffix}</span>
              </span>
            )}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
