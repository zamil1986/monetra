import type { CategoryType } from "@/domain/types";

/** PRD 3.6. Copied to every new Akun; after that they belong to the Pengguna. Icons are lucide names. */
export const DEFAULT_CATEGORIES: { name: string; type: CategoryType; icon: string; color: string }[] = [
  { name: "Salary", type: "INCOME", icon: "briefcase", color: "green" },
  { name: "Allowance", type: "INCOME", icon: "hand-coins", color: "teal" },
  { name: "Freelance", type: "INCOME", icon: "laptop", color: "teal" },
  { name: "Business", type: "INCOME", icon: "store", color: "olive" },
  { name: "Investment", type: "INCOME", icon: "trending-up", color: "blue" },
  { name: "Gift", type: "INCOME", icon: "gift", color: "magenta" },
  { name: "Other Income", type: "INCOME", icon: "ellipsis", color: "slate" },
  { name: "Food", type: "EXPENSE", icon: "utensils", color: "orange" },
  { name: "Transportation", type: "EXPENSE", icon: "bus", color: "blue" },
  { name: "Education", type: "EXPENSE", icon: "graduation-cap", color: "violet" },
  { name: "Shopping", type: "EXPENSE", icon: "shopping-bag", color: "magenta" },
  { name: "Entertainment", type: "EXPENSE", icon: "clapperboard", color: "violet" },
  { name: "Healthcare", type: "EXPENSE", icon: "heart-pulse", color: "teal" },
  { name: "Bills", type: "EXPENSE", icon: "receipt", color: "slate" },
  { name: "Personal Care", type: "EXPENSE", icon: "scissors", color: "olive" },
  { name: "Biaya Admin", type: "EXPENSE", icon: "landmark", color: "brown" },
  { name: "Other Expense", type: "EXPENSE", icon: "ellipsis", color: "slate" },
];
