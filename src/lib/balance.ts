import type { SettingsType, TransactionType } from "@/lib/types";
import { MONTH_SHORT, logicalTodayKey, txDateKey } from "@/lib/dates";

// The balance is calibrated by hand in Settings at a point in time. Entries
// dated on or before that moment are assumed to be in the calibrated number;
// everything dated after it moves the balance.

const signed = (t: TransactionType) =>
  t.type === "income" ? t.amount : -t.amount;

export function currentBalance(
  transactions: TransactionType[],
  settings: SettingsType | null,
) {
  const calibrated = settings?.currentBalance ?? 0;
  const calibratedAt = settings?.balanceDate
    ? new Date(settings.balanceDate).getTime()
    : Date.now();
  let balance = calibrated;
  for (const t of transactions) {
    if (new Date(t.date).getTime() > calibratedAt) balance += signed(t);
  }
  return balance;
}

export interface BalancePoint {
  date: string;
  label: string;
  balance: number;
}

/** End-of-day balance for every day with activity this year. */
export function balanceSeries(
  transactions: TransactionType[],
  settings: SettingsType | null,
  year: number,
): BalancePoint[] {
  const now = currentBalance(transactions, settings);
  const yearStart = `${year}-01-01`;
  const todayKey = logicalTodayKey();

  const netByDay = new Map<string, number>();
  for (const t of transactions) {
    const key = txDateKey(t.date);
    netByDay.set(key, (netByDay.get(key) ?? 0) + signed(t));
  }

  // Walk backwards from today: balance at end of day D = now − Σ(after D).
  const keys = [...netByDay.keys()]
    .filter((key) => key >= yearStart && key <= todayKey)
    .sort();
  let afterTotal = 0;
  for (const [key, net] of netByDay) {
    if (key > todayKey) afterTotal += net;
  }
  const points: BalancePoint[] = [];
  let running = now - afterTotal;
  for (let i = keys.length - 1; i >= 0; i--) {
    const key = keys[i];
    const [, m, d] = key.split("-").map(Number);
    points.push({
      date: key,
      label: `${MONTH_SHORT[m - 1]} ${d}`,
      balance: Math.round(running * 100) / 100,
    });
    running -= netByDay.get(key) ?? 0;
  }
  points.reverse();
  if (!points.length || points[0].date !== yearStart) {
    points.unshift({
      date: yearStart,
      label: "Jan 1",
      balance: Math.round(running * 100) / 100,
    });
  }
  if (points[points.length - 1].date !== todayKey) {
    points.push({
      date: todayKey,
      label: "Today",
      balance: points[points.length - 1].balance,
    });
  }
  return points;
}
