import { db } from "./db";
import { DEFAULT_CATEGORIES } from "./default-categories";

const DEFAULT_ORDER = new Map(DEFAULT_CATEGORIES.map((c, i) => [c.name, i]));

export type CategoryView = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string;
  color: string;
  archived: boolean;
};

export async function listCategories(userId: string): Promise<CategoryView[]> {
  const rows = await db.category.findMany({ where: { userId }, orderBy: [{ createdAt: "asc" }, { name: "asc" }] });
  // Defaults are created in one statement and share a timestamp; keep them in PRD order.
  const rank = (name: string) => DEFAULT_ORDER.get(name) ?? DEFAULT_ORDER.size;
  rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || rank(a.name) - rank(b.name));
  return rows.map((c) => ({ id: c.id, name: c.name, type: c.type, icon: c.icon, color: c.color, archived: c.archivedAt !== null }));
}
