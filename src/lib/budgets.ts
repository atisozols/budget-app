import type { BudgetEntry, TransactionType } from "@/lib/types";
import {
  type CategoryIndex,
  categoryWithDescendants,
} from "@/lib/categories";
import {
  daysInMonthKey,
  logicalToday,
  monthKeyOf,
  shiftMonthKey,
  txMonthKey,
} from "@/lib/dates";

/** Expense total for a category (and its subcategories) per month key. */
export function monthlyCategoryTotals(
  transactions: TransactionType[],
  categoryId: string,
  index: CategoryIndex,
) {
  const ids = categoryWithDescendants(categoryId, index);
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !ids.has(t.categoryId?._id ?? "")) continue;
    const key = txMonthKey(t.date);
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }
  return totals;
}

export interface CategoryAverage {
  average3: number;
  average6: number;
  lastMonth: number;
  months: { monthKey: string; amount: number }[]; // oldest first, 6 months
}

/** Averages over the last complete months (the current month excluded). */
export function categoryAverages(
  transactions: TransactionType[],
  categoryId: string,
  index: CategoryIndex,
  now?: Date,
): CategoryAverage {
  const current = monthKeyOf(logicalToday(now));
  const totals = monthlyCategoryTotals(transactions, categoryId, index);
  const months = [6, 5, 4, 3, 2, 1].map((n) => {
    const monthKey = shiftMonthKey(current, -n);
    return { monthKey, amount: totals.get(monthKey) ?? 0 };
  });
  const avg = (list: { amount: number }[]) =>
    list.reduce((s, m) => s + m.amount, 0) / Math.max(list.length, 1);
  return {
    average3: avg(months.slice(-3)),
    average6: avg(months),
    lastMonth: months[months.length - 1].amount,
    months,
  };
}

export interface BudgetProgress {
  categoryId: string;
  budget: number;
  spent: number;
  remaining: number;
  /** Where spending "should" be by today if spread evenly. */
  expectedByNow: number;
  projected: number;
  status: "under" | "watch" | "over";
}

export function budgetProgress(
  budgets: BudgetEntry[],
  transactions: TransactionType[],
  index: CategoryIndex,
  now?: Date,
): BudgetProgress[] {
  const today = logicalToday(now);
  const current = monthKeyOf(today);
  const daysInMonth = daysInMonthKey(current);
  const progress = today.getDate() / daysInMonth;

  return budgets
    .filter((budget) => index.byId.has(budget.categoryId))
    .map((budget) => {
      const spent =
        monthlyCategoryTotals(transactions, budget.categoryId, index).get(
          current,
        ) ?? 0;
      const expectedByNow = budget.amount * progress;
      const projected = progress > 0 ? spent / progress : spent;
      // A few days in, the pace projection is mostly noise.
      const paceIsMeaningful = today.getDate() >= 7;
      const status: BudgetProgress["status"] =
        spent > budget.amount
          ? "over"
          : paceIsMeaningful && projected > budget.amount
            ? "watch"
            : "under";
      return {
        categoryId: budget.categoryId,
        budget: budget.amount,
        spent,
        remaining: budget.amount - spent,
        expectedByNow,
        projected,
        status,
      };
    });
}
