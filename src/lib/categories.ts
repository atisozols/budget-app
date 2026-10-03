import type { CategoryType, TransactionType } from "@/lib/types";

// Categories are two levels deep: a top-level category can hold
// subcategories, and transactions can sit on either level. Totals for a
// top-level category always include its subcategories.

export interface CategoryIndex {
  byId: Map<string, CategoryType>;
  children: Map<string, CategoryType[]>;
  roots: CategoryType[];
}

export function buildCategoryIndex(categories: CategoryType[]): CategoryIndex {
  const byId = new Map<string, CategoryType>();
  for (const category of categories) byId.set(category._id, category);

  const children = new Map<string, CategoryType[]>();
  const roots: CategoryType[] = [];
  for (const category of categories) {
    const parentId = category.parentId ? String(category.parentId) : null;
    if (parentId && byId.has(parentId)) {
      const list = children.get(parentId) ?? [];
      list.push(category);
      children.set(parentId, list);
    } else {
      roots.push(category);
    }
  }

  return { byId, children, roots };
}

/** Resolves a (possibly stale) populated category to the indexed one. */
export function resolveCategory(
  category: CategoryType | null | undefined,
  index: CategoryIndex,
): CategoryType | null {
  if (!category) return null;
  return index.byId.get(category._id) ?? category;
}

export function parentOf(
  category: CategoryType | null | undefined,
  index: CategoryIndex,
): CategoryType | null {
  if (!category?.parentId) return null;
  return index.byId.get(String(category.parentId)) ?? null;
}

/** The top-level category a category rolls up into (itself if top-level). */
export function rootOf(
  category: CategoryType | null | undefined,
  index: CategoryIndex,
): CategoryType | null {
  const resolved = resolveCategory(category, index);
  if (!resolved) return null;
  return parentOf(resolved, index) ?? resolved;
}

export function categoryLabel(
  category: CategoryType | null | undefined,
  index: CategoryIndex,
  separator = " › ",
) {
  const resolved = resolveCategory(category, index);
  if (!resolved) return "Unknown";
  const parent = parentOf(resolved, index);
  return parent ? `${parent.name}${separator}${resolved.name}` : resolved.name;
}

/** The category id plus all of its subcategory ids. */
export function categoryWithDescendants(id: string, index: CategoryIndex) {
  const ids = new Set<string>([id]);
  for (const child of index.children.get(id) ?? []) ids.add(child._id);
  return ids;
}

export function txCategory(t: TransactionType, index: CategoryIndex) {
  return resolveCategory(t.categoryId, index);
}

/** Tax payments are expenses in a category flagged as tax. */
export function isTaxPayment(t: TransactionType, index: CategoryIndex) {
  if (t.type !== "expense") return false;
  return Boolean(txCategory(t, index)?.isTax);
}

/** Debt repayments: obligation categories that aren't tax, or legacy flag. */
export function isDebtRepayment(t: TransactionType, index: CategoryIndex) {
  if (t.type !== "expense") return false;
  if (t.debtPayment === "credit") return true;
  const category = txCategory(t, index);
  return Boolean(
    category && category.budgetType === "obligations" && !category.isTax,
  );
}

/** Everyday spending: expenses that aren't tax or debt repayment. */
export function isLifestyleExpense(t: TransactionType, index: CategoryIndex) {
  if (t.type !== "expense") return false;
  if (t.debtPayment) return false;
  const category = txCategory(t, index);
  return category?.budgetType !== "obligations" && !category?.isTax;
}

export function budgetTypeOf(t: TransactionType, index: CategoryIndex) {
  return txCategory(t, index)?.budgetType ?? "needs";
}
