import {
  Banknote, BriefcaseBusiness, Bus, Clapperboard, Ellipsis, Gift, GraduationCap, HandCoins, HeartPulse,
  Landmark, Laptop, PiggyBank, Receipt, Scissors, ShoppingBag, Smartphone, Store, TrendingUp, Utensils,
  ArrowLeftRight, type LucideIcon,
} from "lucide-react";
import { cx } from "./ui";

/** Kategori icons are stored as lucide names; only the ones in use need mapping. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  briefcase: BriefcaseBusiness, "hand-coins": HandCoins, laptop: Laptop, store: Store, "trending-up": TrendingUp,
  gift: Gift, ellipsis: Ellipsis, utensils: Utensils, bus: Bus, "graduation-cap": GraduationCap,
  "shopping-bag": ShoppingBag, clapperboard: Clapperboard, "heart-pulse": HeartPulse, receipt: Receipt,
  scissors: Scissors, landmark: Landmark,
};

export const WALLET_ICONS: Record<string, { Icon: LucideIcon; label: string }> = {
  bank: { Icon: Landmark, label: "Bank" },
  cash: { Icon: Banknote, label: "Cash" },
  ewallet: { Icon: Smartphone, label: "E-wallet" },
  savings: { Icon: PiggyBank, label: "Savings" },
};

export const walletIcon = (icon: string) => (WALLET_ICONS[icon] ?? WALLET_ICONS.bank!).Icon;

export const categoryIcon = (name: string | null): LucideIcon => (name && CATEGORY_ICONS[name]) || ArrowLeftRight;

/** CSS color for a stored hue name, for use as `--c` with `bg-(--c)`. */
export const hue = (color: string | null) =>
  color === "green" ? "var(--color-green)" : color ? `var(--color-hue-${color})` : "var(--color-ink-2)";

export function Glyph({ Icon, color }: { Icon: LucideIcon; color: string | null }) {
  return (
    <span
      className={cx(
        "inline-grid size-8 flex-none place-items-center rounded [&_svg]:size-[17px]!",
        color ? "bg-(--c) text-white" : "bg-panel text-ink-2",
      )}
      style={color ? { ["--c" as string]: hue(color) } : undefined}
    >
      <Icon />
    </span>
  );
}
