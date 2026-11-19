import type { CategoryIcon } from "@/domain/category-rules";
import type { Color } from "@/domain/palette";
import type { CategoryType } from "@/domain/types";

/** PRD 3.6, in screen order. Copied to every new Akun; after that they belong to the Pengguna. */
export const DEFAULT_CATEGORIES: { name: string; type: CategoryType; icon: CategoryIcon; color: Color }[] = [
  { name: "Gaji", type: "INCOME", icon: "briefcase", color: "green" },
  { name: "Uang Saku", type: "INCOME", icon: "hand-coins", color: "teal" },
  { name: "Freelance", type: "INCOME", icon: "laptop", color: "teal" },
  { name: "Bisnis", type: "INCOME", icon: "store", color: "olive" },
  { name: "Investasi", type: "INCOME", icon: "trending-up", color: "blue" },
  { name: "Hadiah", type: "INCOME", icon: "gift", color: "magenta" },
  { name: "Pemasukan Lain", type: "INCOME", icon: "ellipsis", color: "slate" },
  { name: "Makanan", type: "EXPENSE", icon: "utensils", color: "orange" },
  { name: "Transportasi", type: "EXPENSE", icon: "bus", color: "blue" },
  { name: "Pendidikan", type: "EXPENSE", icon: "graduation-cap", color: "violet" },
  { name: "Belanja", type: "EXPENSE", icon: "shopping-bag", color: "magenta" },
  { name: "Hiburan", type: "EXPENSE", icon: "clapperboard", color: "violet" },
  { name: "Kesehatan", type: "EXPENSE", icon: "heart-pulse", color: "teal" },
  { name: "Tagihan", type: "EXPENSE", icon: "receipt", color: "slate" },
  { name: "Perawatan Diri", type: "EXPENSE", icon: "scissors", color: "olive" },
  { name: "Biaya Admin", type: "EXPENSE", icon: "landmark", color: "brown" },
  { name: "Pengeluaran Lain", type: "EXPENSE", icon: "ellipsis", color: "slate" },
];
