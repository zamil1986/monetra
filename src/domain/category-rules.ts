import { domainError, type DomainError } from "./errors";
import type { MessageKey, Params } from "./i18n";
import { type Color, isColor } from "./palette";
import { err, ok, type Result } from "./result";
import type { CategoryType } from "./types";

/** Lucide names a Kategori may use (PRD 3.6: icons come from a fixed list). */
export const CATEGORY_ICONS = [
  "briefcase", "hand-coins", "laptop", "store", "trending-up", "gift", "coins", "piggy-bank", "wallet",
  "utensils", "coffee", "shopping-bag", "shopping-cart", "bus", "car", "fuel", "plane",
  "house", "zap", "wifi", "smartphone", "receipt", "landmark",
  "graduation-cap", "book-open", "heart-pulse", "pill", "scissors", "shirt", "baby", "dog",
  "clapperboard", "gamepad-2", "music", "dumbbell", "heart", "wrench", "ellipsis",
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const MAX_CATEGORY_NAME = 30;

export type CategoryInput = { name: string; icon: string; color: string };
export type ValidCategoryInput = { name: string; icon: CategoryIcon; color: Color };

/** A Kategori the Pengguna already has, archived or not, as the naming rule sees it. */
export type ExistingCategory = { id: string; name: string; type: CategoryType; archived: boolean };

const invalid = (field: string, key: MessageKey, params?: Params, code = "INVALID_CATEGORY"): Result<never, DomainError> =>
  err(domainError(code, key, params, field));

const sameName = (a: string, b: string) => a.localeCompare(b, "id", { sensitivity: "accent" }) === 0;

/** The Kategori of this type already called `name` (case and spacing aside), other than `selfId`. */
export function findNameClash(name: string, type: CategoryType, existing: ExistingCategory[], selfId: string | null = null) {
  const clean = name.trim().replace(/\s+/g, " ");
  return existing.find((c) => c.id !== selfId && c.type === type && sameName(c.name, clean));
}

/**
 * PRD 3.6: a name of 1–30 characters, unique within its type regardless of case, counting
 * archived Kategori too. `selfId` is the Kategori being edited, which may keep its own name.
 */
export function validateCategoryInput(
  input: CategoryInput,
  type: CategoryType,
  existing: ExistingCategory[],
  selfId: string | null = null,
): Result<ValidCategoryInput, DomainError> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) return invalid("name", "error.category.nameMissing");
  if (name.length > MAX_CATEGORY_NAME) return invalid("name", "error.name.tooLong", { max: MAX_CATEGORY_NAME });

  const clash = findNameClash(name, type, existing, selfId);
  if (clash) {
    const kind = type === "INCOME" ? "Income" : "Expense";
    return invalid(
      "name",
      clash.archived ? `error.category.takenArchived${kind}` : `error.category.taken${kind}`,
      { name: clash.name },
      "CATEGORY_NAME_TAKEN",
    );
  }

  if (!isColor(input.color)) return invalid("color", "error.color");
  if (!(CATEGORY_ICONS as readonly string[]).includes(input.icon)) return invalid("icon", "error.icon");
  return ok({ name, icon: input.icon as CategoryIcon, color: input.color });
}

/**
 * PRD 3.6: the last active Kategori of a type can't be archived or deleted, so an Income or
 * Expense can always be recorded. `activeOfSameType` counts the Kategori itself when active.
 */
export function checkLeavesOneActive(category: { type: CategoryType; archived: boolean; activeOfSameType: number }): Result<void, DomainError> {
  if (category.archived || category.activeOfSameType > 1) return ok(undefined);
  return err(domainError("LAST_ACTIVE_CATEGORY", category.type === "INCOME" ? "error.category.lastActiveIncome" : "error.category.lastActiveExpense"));
}

/** PRD 3.6: a Kategori any Transaksi uses is archived instead. */
export function checkDelete(category: { transactionCount: number }): Result<void, DomainError> {
  if (category.transactionCount === 0) return ok(undefined);
  return err(domainError("CATEGORY_IN_USE", "error.category.inUse"));
}
