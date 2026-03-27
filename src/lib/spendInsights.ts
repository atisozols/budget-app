import type { TransactionType } from "@/lib/types";

const EXCLUDED_SPEND_WIDGET_CATEGORY_NAMES = new Set([
  "tax",
  "taxes",
  "savings",
  "investment",
  "investments",
]);

function normalizeCategoryName(name?: string) {
  return name?.trim().toLowerCase() ?? "";
}

export function isExcludedFromSpendWidgets(transaction: TransactionType) {
  if (transaction.debtPayment === "tax") {
    return true;
  }

  return EXCLUDED_SPEND_WIDGET_CATEGORY_NAMES.has(
    normalizeCategoryName(transaction.categoryId?.name),
  );
}

export function isSpendWidgetExpense(transaction: TransactionType) {
  return (
    transaction.type === "expense" &&
    !transaction.recurringPaymentId &&
    !isExcludedFromSpendWidgets(transaction)
  );
}
