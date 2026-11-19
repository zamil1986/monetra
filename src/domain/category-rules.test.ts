import { describe, expect, it } from "vitest";
import { checkDelete, checkLeavesOneActive, validateCategoryInput, type ExistingCategory } from "./category-rules";

const existing: ExistingCategory[] = [
  { id: "makanan", name: "Makanan", type: "EXPENSE", archived: false },
  { id: "kopi", name: "Kopi", type: "EXPENSE", archived: true },
  { id: "gaji", name: "Gaji", type: "INCOME", archived: false },
];
const input = (name: string) => ({ name, icon: "coffee", color: "orange" });

describe("naming a Kategori", () => {
  it("accepts a new name and tidies its spacing", () => {
    expect(validateCategoryInput(input("  Jajan   Sore "), "EXPENSE", existing)).toEqual({
      ok: true,
      value: { name: "Jajan Sore", icon: "coffee", color: "orange" },
    });
  });

  it("refuses an empty name and one over 30 characters", () => {
    expect(validateCategoryInput(input("   "), "EXPENSE", existing).ok).toBe(false);
    expect(validateCategoryInput(input("x".repeat(31)), "EXPENSE", existing).ok).toBe(false);
    expect(validateCategoryInput(input("x".repeat(30)), "EXPENSE", existing).ok).toBe(true);
  });

  it("refuses a name another expense category has, whatever the case", () => {
    const result = validateCategoryInput(input("makanan"), "EXPENSE", existing);
    expect(result).toMatchObject({ ok: false, error: { code: "CATEGORY_NAME_TAKEN", field: "name" } });
  });

  it("points to unarchiving when the name belongs to an archived category", () => {
    const result = validateCategoryInput(input("KOPI"), "EXPENSE", existing);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("Unarchive it instead");
  });

  it("allows the same name across income and expense", () => {
    expect(validateCategoryInput(input("Gaji"), "EXPENSE", existing).ok).toBe(true);
  });

  it("lets a category keep or recase its own name", () => {
    expect(validateCategoryInput(input("MAKANAN"), "EXPENSE", existing, "makanan").ok).toBe(true);
  });

  it("refuses an icon or color outside the fixed lists", () => {
    expect(validateCategoryInput({ name: "Jajan", icon: "rocket", color: "orange" }, "EXPENSE", existing)).toMatchObject({ ok: false, error: { field: "icon" } });
    expect(validateCategoryInput({ name: "Jajan", icon: "coffee", color: "#ff0000" }, "EXPENSE", existing)).toMatchObject({ ok: false, error: { field: "color" } });
  });
});

describe("archiving or deleting a Kategori", () => {
  it("is refused for the last active category of its type", () => {
    expect(checkLeavesOneActive({ type: "INCOME", archived: false, activeOfSameType: 1 })).toMatchObject({
      ok: false,
      error: { code: "LAST_ACTIVE_CATEGORY" },
    });
  });

  it("is allowed while another active category of that type remains", () => {
    expect(checkLeavesOneActive({ type: "EXPENSE", archived: false, activeOfSameType: 2 }).ok).toBe(true);
  });

  it("never blocks a category that is already archived", () => {
    expect(checkLeavesOneActive({ type: "EXPENSE", archived: true, activeOfSameType: 1 }).ok).toBe(true);
  });

  it("deletes only a category no transaction ever used", () => {
    expect(checkDelete({ transactionCount: 0 }).ok).toBe(true);
    expect(checkDelete({ transactionCount: 3 })).toMatchObject({ ok: false, error: { code: "CATEGORY_IN_USE" } });
  });
});
