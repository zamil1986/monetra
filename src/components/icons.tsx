import {
  ArrowLeftRight, Baby, Banknote, BookOpen, BriefcaseBusiness, Bus, Car, Clapperboard, Coffee, Coins, Dog,
  Dumbbell, Ellipsis, Fuel, Gamepad2, Gift, GraduationCap, HandCoins, Heart, HeartPulse, House, Landmark, Laptop,
  Music, PiggyBank, Pill, Plane, Receipt, Scissors, Shirt, ShoppingBag, ShoppingCart, Smartphone, Store,
  TrendingUp, Utensils, Wallet, Wifi, Wrench, Zap, type LucideIcon,
} from "lucide-react";
import type { CategoryIcon } from "@/domain/category-rules";
import { cx } from "./ui";

/** Every icon a Kategori may use (CATEGORY_ICONS), keyed by its stored lucide name. */
export const CATEGORY_ICON_COMPONENTS: Record<CategoryIcon, LucideIcon> = {
  briefcase: BriefcaseBusiness, "hand-coins": HandCoins, laptop: Laptop, store: Store, "trending-up": TrendingUp,
  gift: Gift, coins: Coins, "piggy-bank": PiggyBank, wallet: Wallet, utensils: Utensils, coffee: Coffee,
  "shopping-bag": ShoppingBag, "shopping-cart": ShoppingCart, bus: Bus, car: Car, fuel: Fuel, plane: Plane,
  house: House, zap: Zap, wifi: Wifi, smartphone: Smartphone, receipt: Receipt, landmark: Landmark,
  "graduation-cap": GraduationCap, "book-open": BookOpen, "heart-pulse": HeartPulse, pill: Pill, scissors: Scissors,
  shirt: Shirt, baby: Baby, dog: Dog, clapperboard: Clapperboard, "gamepad-2": Gamepad2, music: Music,
  dumbbell: Dumbbell, heart: Heart, wrench: Wrench, ellipsis: Ellipsis,
};
const CATEGORY_ICONS: Record<string, LucideIcon> = CATEGORY_ICON_COMPONENTS;

/** Labelled by `walletIcon.<key>` in the catalog. */
export const WALLET_ICONS: Record<string, { Icon: LucideIcon }> = {
  bank: { Icon: Landmark },
  cash: { Icon: Banknote },
  ewallet: { Icon: Smartphone },
  savings: { Icon: PiggyBank },
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
