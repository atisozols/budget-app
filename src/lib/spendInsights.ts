import type { TransactionType } from "@/lib/types";
import { logicalToday, toDateKey, txDateKey } from "@/lib/dates";

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
  return toDateKey(date);
}

/** Everyday one-off spending: needs/wants, not bills, tax or debt. */
export function isSpendWidgetExpense(transaction: TransactionType) {
  return (
    transaction.type === "expense" &&
    !transaction.recurringPaymentId &&
    !transaction.debtPayment &&
    !transaction.categoryId?.isTax &&
    SPEND_WIDGET_BUDGET_TYPES.has(transaction.categoryId?.budgetType ?? "")
  );
}

export function spendByDateKey(transactions: TransactionType[]) {
  const spendByDate = new Map<string, number>();
  for (const transaction of transactions) {
    if (!isSpendWidgetExpense(transaction)) continue;
    const key = txDateKey(transaction.date);
    spendByDate.set(key, (spendByDate.get(key) || 0) + transaction.amount);
  }
  return spendByDate;
}

export function buildSpendWidgetDailySeries(
  transactions: TransactionType[],
  year: number,
) {
  const today = logicalToday();
  const jan1 = new Date(year, 0, 1);
  const endDate = year === today.getFullYear() ? today : new Date(year, 11, 31);

  const spendByDate = spendByDateKey(transactions);

  const series: SpendWidgetDay[] = [];
  let totalSpend = 0;
  let dayCount = 0;

  const cursor = new Date(jan1);
  while (cursor <= endDate) {
    const day = new Date(cursor);
    const dateKey = toDateKey(day);
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

export interface RecentDay {
  date: Date;
  dateKey: string;
  spend: number;
  transactions: TransactionType[];
  isToday: boolean;
}

/** The last `days` days (today included), crossing year boundaries. */
export function recentSpendDays(
  transactions: TransactionType[],
  days: number,
): RecentDay[] {
  const today = logicalToday();
  const byKey = new Map<string, TransactionType[]>();
  for (const t of transactions) {
    if (!isSpendWidgetExpense(t)) continue;
    const key = txDateKey(t.date);
    const list = byKey.get(key) ?? [];
    list.push(t);
    byKey.set(key, list);
  }
  const result: RecentDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateKey = toDateKey(date);
    const list = byKey.get(dateKey) ?? [];
    result.push({
      date,
      dateKey,
      spend: list.reduce((s, t) => s + t.amount, 0),
      transactions: list,
      isToday: i === 0,
    });
  }
  return result;
}
