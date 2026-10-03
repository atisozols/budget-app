import type { TransactionType, RecurringPaymentType } from "@/lib/types";
import type { SpendWidgetDay } from "@/lib/spendInsights";
import {
  type CategoryIndex,
  isLifestyleExpense,
  isTaxPayment,
  resolveCategory,
  rootOf,
} from "@/lib/categories";
import { logicalToday, txDateKey, txMonthKey } from "@/lib/dates";

// ─── Category trends (month-over-month, same day range) ─────────────

export interface CategoryTrend {
  categoryId: string;
  name: string;
  emoji: string;
  color: string;
  current: number;
  previous: number;
  delta: number;
  pctChange: number | null; // null when previous === 0 (new spending)
  sparkline: number[]; // last 6 months of totals, current month-to-date last
}

export function computeCategoryTrends(
  transactions: TransactionType[],
  index: CategoryIndex,
  referenceDate: Date = logicalToday(),
  limit = 5,
): CategoryTrend[] {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const dayOfMonth = referenceDate.getDate();

  interface Bucket {
    name: string;
    emoji: string;
    color: string;
    current: number;
    previous: number;
    monthly: number[]; // index 0..5, oldest first
  }
  const buckets = new Map<string, Bucket>();

  for (const t of transactions) {
    if (!isLifestyleExpense(t, index)) continue;
    const key = txDateKey(t.date);
    const offset =
      (year - Number(key.slice(0, 4))) * 12 + (month - (Number(key.slice(5, 7)) - 1));
    if (offset < 0 || offset > 5) continue;

    const root = rootOf(t.categoryId, index);
    const catId = root?._id || "unknown";
    let bucket = buckets.get(catId);
    if (!bucket) {
      bucket = {
        name: root?.name || "Unknown",
        emoji: root?.emoji || "📦",
        color: root?.color || "#6366f1",
        current: 0,
        previous: 0,
        monthly: [0, 0, 0, 0, 0, 0],
      };
      buckets.set(catId, bucket);
    }

    bucket.monthly[5 - offset] += t.amount;

    if (offset === 0) {
      bucket.current += t.amount;
    } else if (offset === 1 && Number(key.slice(8, 10)) <= dayOfMonth) {
      // Compare against the same day range of last month
      bucket.previous += t.amount;
    }
  }

  const trends: CategoryTrend[] = [];
  for (const [categoryId, b] of buckets) {
    if (Math.max(b.current, b.previous) < 1) continue;
    const delta = b.current - b.previous;
    trends.push({
      categoryId,
      name: b.name,
      emoji: b.emoji,
      color: b.color,
      current: b.current,
      previous: b.previous,
      delta,
      pctChange: b.previous > 0 ? (delta / b.previous) * 100 : null,
      sparkline: b.monthly,
    });
  }

  return trends
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, limit);
}

// ─── Month-end spending forecast ─────────────────────────────────────

export interface MonthForecast {
  spentSoFar: number;
  variablePacePerDay: number;
  projectedVariable: number;
  unpaidRecurringTotal: number;
  unpaidRecurringCount: number;
  projectedTotal: number;
  lastMonthTotal: number;
  pctVsLastMonth: number | null;
  daysElapsed: number;
  daysRemaining: number;
  daysInMonth: number;
}

export function computeMonthForecast(
  transactions: TransactionType[],
  recurring: RecurringPaymentType[],
  index: CategoryIndex,
  referenceDate: Date = logicalToday(),
): MonthForecast {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const dayOfMonth = referenceDate.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const currentKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const prev = new Date(year, month - 1, 1);
  const previousKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

  let spentSoFar = 0;
  let variableSpent = 0;
  const paidRecurringIds = new Set<string>();
  let lastMonthTotal = 0;

  for (const t of transactions) {
    if (t.type !== "expense" || isTaxPayment(t, index)) continue;
    const key = txMonthKey(t.date);
    if (key === currentKey) {
      spentSoFar += t.amount;
      if (t.recurringPaymentId) paidRecurringIds.add(String(t.recurringPaymentId));
      else if (isLifestyleExpense(t, index)) variableSpent += t.amount;
    } else if (key === previousKey) {
      lastMonthTotal += t.amount;
    }
  }

  const unpaidRecurring = recurring.filter(
    (p) =>
      p.isActive &&
      !paidRecurringIds.has(p._id) &&
      (!p.startDate || txMonthKey(p.startDate) <= currentKey),
  );
  const unpaidRecurringTotal = unpaidRecurring.reduce(
    (s, p) => s + p.amount,
    0,
  );

  const variablePacePerDay = dayOfMonth > 0 ? variableSpent / dayOfMonth : 0;
  const projectedVariable = variablePacePerDay * daysRemaining;
  const projectedTotal = spentSoFar + projectedVariable + unpaidRecurringTotal;

  return {
    spentSoFar,
    variablePacePerDay,
    projectedVariable,
    unpaidRecurringTotal,
    unpaidRecurringCount: unpaidRecurring.length,
    projectedTotal,
    lastMonthTotal,
    pctVsLastMonth:
      lastMonthTotal > 0
        ? ((projectedTotal - lastMonthTotal) / lastMonthTotal) * 100
        : null,
    daysElapsed: dayOfMonth,
    daysRemaining,
    daysInMonth,
  };
}

// ─── Composite health score ──────────────────────────────────────────

export interface HealthFactor {
  key: string;
  label: string;
  score: number; // 0-100
  weight: number;
  detail: string;
}

export interface HealthResult {
  score: number;
  label: string;
  color: string;
  factors: HealthFactor[];
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function healthColor(score: number) {
  if (score >= 80) return "#34d399"; // emerald-400
  if (score >= 60) return "#2dd4bf"; // teal-400
  if (score >= 40) return "#38bdf8"; // sky-400
  if (score >= 20) return "#818cf8"; // indigo-400
  return "#f87171"; // red-400
}

export function computeHealthScore(params: {
  /** All transactions (prior years give the income baseline in Q1). */
  transactions: TransactionType[];
  dailySeries: SpendWidgetDay[];
  totalDebt: number;
  /** Tax owed on this year's bruto income so far. */
  yearTaxOwed: number;
  index: CategoryIndex;
  referenceDate?: Date;
}): HealthResult {
  const { transactions, dailySeries, totalDebt, yearTaxOwed, index } = params;
  const now = params.referenceDate ?? logicalToday();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthProgress = dayOfMonth / daysInMonth;

  // Monthly income totals: current month-to-date + previous 3 months
  let currentIncome = 0;
  const prevIncomes = [0, 0, 0];
  let yearIncome = 0;
  let yearExpense = 0;
  let needsSpend = 0;
  let wantsSpend = 0;

  for (const t of transactions) {
    const key = txDateKey(t.date);
    const offset =
      (year - Number(key.slice(0, 4))) * 12 + (month - (Number(key.slice(5, 7)) - 1));
    const inYear = Number(key.slice(0, 4)) === year && offset >= 0;
    if (t.type === "income") {
      if (inYear) yearIncome += t.amount;
      if (offset === 0) currentIncome += t.amount;
      else if (offset >= 1 && offset <= 3) prevIncomes[offset - 1] += t.amount;
    } else if (inYear && !isTaxPayment(t, index)) {
      // Tax is accounted for as owed (yearTaxOwed), not as payments made.
      yearExpense += t.amount;
      const bt = resolveCategory(t.categoryId, index)?.budgetType;
      if (bt === "needs") needsSpend += t.amount;
      else if (bt === "wants") wantsSpend += t.amount;
    }
  }

  const prevMonthsWithIncome = prevIncomes.filter((v) => v > 0);
  const prevAvgIncome =
    prevMonthsWithIncome.length > 0
      ? prevMonthsWithIncome.reduce((s, v) => s + v, 0) /
        prevMonthsWithIncome.length
      : 0;

  // 1. Income trend — month-to-date vs prorated 3-month average
  let incomeScore = 50;
  let incomeDetail = "No income history yet";
  if (prevAvgIncome > 0) {
    const expected = prevAvgIncome * monthProgress;
    const ratio = expected > 0 ? currentIncome / expected : 1;
    incomeScore = clamp(50 + (ratio - 1) * 125);
    incomeDetail =
      ratio >= 1
        ? `${((ratio - 1) * 100).toFixed(0)}% ahead of your 3-month pace`
        : `${((1 - ratio) * 100).toFixed(0)}% behind your 3-month pace`;
  } else if (currentIncome > 0) {
    incomeScore = 75;
    incomeDetail = "Income this month, no prior baseline";
  }

  // 2. Spend trend — running daily average now vs 30 days ago
  let spendScore = 50;
  let spendDetail = "Not enough spending history";
  if (dailySeries.length > 30) {
    const avgNow =
      dailySeries[dailySeries.length - 1]?.runningAverageSpend ?? 0;
    const avg30 =
      dailySeries[dailySeries.length - 31]?.runningAverageSpend ?? 0;
    if (avg30 > 0) {
      const declineRatio = (avg30 - avgNow) / avg30;
      spendScore = clamp(50 + declineRatio * 500);
      spendDetail =
        declineRatio >= 0
          ? `Daily average down ${(declineRatio * 100).toFixed(1)}% in 30 days`
          : `Daily average up ${(-declineRatio * 100).toFixed(1)}% in 30 days`;
    }
  }

  // 3. Savings rate — year to date, after tax owed
  let savingsScore = 50;
  let savingsDetail = "No income recorded";
  if (yearIncome > 0) {
    const rate = (yearIncome - yearTaxOwed - yearExpense) / yearIncome;
    savingsScore = clamp(25 + rate * 375);
    savingsDetail = `${(rate * 100).toFixed(0)}% of income kept this year`;
  }

  // 4. Debt pressure — debt vs annualized income
  let debtScore = 50;
  let debtDetail = "No income baseline";
  const monthlyIncomeBaseline =
    prevAvgIncome > 0 ? prevAvgIncome : yearIncome / Math.max(month + 1, 1);
  if (monthlyIncomeBaseline > 0) {
    const dti = totalDebt / (monthlyIncomeBaseline * 12);
    debtScore = clamp(100 - dti * 200);
    debtDetail =
      totalDebt <= 0
        ? "Debt free"
        : `Debt is ${(dti * 100).toFixed(0)}% of yearly income`;
  }

  // 5. Budget adherence — needs ≤ 50%, wants ≤ 30%, kept ≥ 20% of
  // after-tax income
  let budgetScore = 50;
  let budgetDetail = "No expenses recorded";
  const afterTaxIncome = yearIncome - yearTaxOwed;
  if (needsSpend + wantsSpend > 0 && afterTaxIncome > 0) {
    const needsRatio = (needsSpend / afterTaxIncome) * 100;
    const wantsRatio = (wantsSpend / afterTaxIncome) * 100;
    const keptRatio = ((afterTaxIncome - yearExpense) / afterTaxIncome) * 100;
    const avgDiff =
      (Math.max(0, needsRatio - 50) +
        Math.max(0, wantsRatio - 30) +
        Math.max(0, 20 - keptRatio)) /
      3;
    budgetScore = clamp(100 - avgDiff * 3);
    budgetDetail = `Needs ${needsRatio.toFixed(0)}% · wants ${wantsRatio.toFixed(0)}% · kept ${keptRatio.toFixed(0)}%`;
  }

  const factors: HealthFactor[] = [
    {
      key: "income",
      label: "Income Trend",
      score: Math.round(incomeScore),
      weight: 0.25,
      detail: incomeDetail,
    },
    {
      key: "spend",
      label: "Spend Trend",
      score: Math.round(spendScore),
      weight: 0.25,
      detail: spendDetail,
    },
    {
      key: "savings",
      label: "Savings Rate",
      score: Math.round(savingsScore),
      weight: 0.2,
      detail: savingsDetail,
    },
    {
      key: "debt",
      label: "Debt Pressure",
      score: Math.round(debtScore),
      weight: 0.15,
      detail: debtDetail,
    },
    {
      key: "budget",
      label: "Budget Split",
      score: Math.round(budgetScore),
      weight: 0.15,
      detail: budgetDetail,
    },
  ];

  const score = Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0));

  let label: string;
  if (score >= 80) label = "Excellent";
  else if (score >= 60) label = "Good";
  else if (score >= 40) label = "Fair";
  else if (score >= 20) label = "Needs Work";
  else label = "Critical";

  return { score, label, color: healthColor(score), factors };
}
