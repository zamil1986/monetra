import {
  Banknote, BriefcaseBusiness, Bus, Clapperboard, Ellipsis, Gift, GraduationCap, HandCoins, HeartPulse,
  Landmark, Laptop, PiggyBank, Receipt, Scissors, ShoppingBag, Smartphone, Store, TrendingUp, Utensils,
  ArrowLeftRight, type LucideIcon,
} from "lucide-react";

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

export const categoryIcon = (name: string | null): LucideIcon => (name && CATEGORY_ICONS[name]) || ArrowLeftRight;

/** CSS color for a stored hue name. */
export const hue = (color: string | null) => (color === "green" ? "var(--green)" : color ? `var(--h-${color})` : "var(--ink-2)");

export function Glyph({ Icon, color }: { Icon: LucideIcon; color: string | null }) {
  if (!color) {
    return <span className="glyph plain"><Icon /></span>;
  }
  return <span className="glyph" style={{ ["--c" as string]: hue(color) }}><Icon /></span>;
}
