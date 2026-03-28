import type { TransactionType } from "@/lib/types";

const SPEND_WIDGET_BUDGET_TYPES = new Set(["needs", "wants"]);

export interface SpendWidgetDay {
  date: Date;
  dateKey: string;
  spend: number;
  averageBeforeSpend: number;
  runningAverageSpend: number;
  isBelowAverage: boolean;
  isToday: boolean;
}

export function toLocalDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSpendWidgetExpense(transaction: TransactionType) {
  return (
    transaction.type === "expense" &&
    !transaction.recurringPaymentId &&
    !transaction.debtPayment &&
    SPEND_WIDGET_BUDGET_TYPES.has(transaction.categoryId?.budgetType ?? "")
  );
}

export function buildSpendWidgetDailySeries(
  transactions: TransactionType[],
  year: number,
) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const jan1 = new Date(year, 0, 1);
  const endDate =
    year === now.getFullYear() ? today : new Date(year, 11, 31);

  const spendByDate = new Map<string, number>();
  for (const transaction of transactions) {
    if (!isSpendWidgetExpense(transaction)) continue;
    const date = new Date(transaction.date);
    const key = toLocalDateKey(date);
    spendByDate.set(key, (spendByDate.get(key) || 0) + transaction.amount);
  }

  const series: SpendWidgetDay[] = [];
  let totalSpend = 0;
  let dayCount = 0;

  const cursor = new Date(jan1);
  while (cursor <= endDate) {
    const day = new Date(cursor);
    const dateKey = toLocalDateKey(day);
    const spend = spendByDate.get(dateKey) || 0;
    const averageBeforeSpend = dayCount > 0 ? totalSpend / dayCount : 0;
    const isBelowAverage = dayCount > 0 && spend < averageBeforeSpend;

    totalSpend += spend;
    dayCount++;

    series.push({
      date: day,
      dateKey,
      spend,
      averageBeforeSpend,
      runningAverageSpend: totalSpend / dayCount,
      isBelowAverage,
      isToday: day.getTime() === today.getTime(),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
}
