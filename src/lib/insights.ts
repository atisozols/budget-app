import type { TransactionType, RecurringPaymentType } from "@/lib/types";
import type { SpendWidgetDay } from "@/lib/spendInsights";
import { isSpendWidgetExpense } from "@/lib/spendInsights";

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

function isTrendExpense(t: TransactionType) {
  return t.type === "expense" && !t.debtPayment;
}

export function computeCategoryTrends(
  transactions: TransactionType[],
  referenceDate: Date = new Date(),
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

  const monthOffset = (d: Date) =>
    (year - d.getFullYear()) * 12 + (month - d.getMonth());

  for (const t of transactions) {
    if (!isTrendExpense(t)) continue;
    const d = new Date(t.date);
    const offset = monthOffset(d);
    if (offset < 0 || offset > 5) continue;

    const catId = t.categoryId?._id || "unknown";
    let bucket = buckets.get(catId);
    if (!bucket) {
      bucket = {
        name: t.categoryId?.name || "Unknown",
        emoji: t.categoryId?.emoji || "📦",
        color: t.categoryId?.color || "#6366f1",
        current: 0,
        previous: 0,
        monthly: [0, 0, 0, 0, 0, 0],
      };
      buckets.set(catId, bucket);
    }

    bucket.monthly[5 - offset] += t.amount;

    if (offset === 0) {
      bucket.current += t.amount;
    } else if (offset === 1 && d.getDate() <= dayOfMonth) {
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

function isRecurringDueInMonth(
  payment: RecurringPaymentType,
  year: number,
  month: number,
) {
  if (!payment.startDate) return true;
  const start = new Date(payment.startDate);
  const offset = (year - start.getFullYear()) * 12 + (month - start.getMonth());
  if (offset < 0) return false;
  if (payment.frequency === "quarterly") return offset % 3 === 0;
  if (payment.frequency === "yearly") return offset % 12 === 0;
  return true;
}

export function computeMonthForecast(
  transactions: TransactionType[],
  recurring: RecurringPaymentType[],
  referenceDate: Date = new Date(),
): MonthForecast {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const dayOfMonth = referenceDate.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  let spentSoFar = 0;
  let variableSpent = 0;
  const paidRecurringIds = new Set<string>();
  let lastMonthTotal = 0;

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const d = new Date(t.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      spentSoFar += t.amount;
      if (t.recurringPaymentId) paidRecurringIds.add(t.recurringPaymentId);
      if (!t.recurringPaymentId && !t.debtPayment) variableSpent += t.amount;
    } else {
      const prev = new Date(year, month - 1, 1);
      if (
        d.getFullYear() === prev.getFullYear() &&
        d.getMonth() === prev.getMonth()
      ) {
        lastMonthTotal += t.amount;
      }
    }
  }

  const unpaidRecurring = recurring.filter(
    (p) =>
      p.isActive &&
      !paidRecurringIds.has(p._id) &&
      isRecurringDueInMonth(p, year, month),
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

// ─── Weekly digest (rolling 7 days) ──────────────────────────────────

export interface WeeklyDigest {
  total: number;
  prevTotal: number;
  pctChange: number | null;
  avgPerDay: number;
  bestDay: { date: Date; spend: number } | null;
  worstDay: { date: Date; spend: number } | null;
  topCategory: {
    name: string;
    emoji: string;
    color: string;
    amount: number;
    share: number;
  } | null;
  days: { date: Date; spend: number }[];
}

export function computeWeeklyDigest(
  transactions: TransactionType[],
  dailySeries: SpendWidgetDay[],
): WeeklyDigest {
  const last7 = dailySeries.slice(-7);
  const prev7 = dailySeries.slice(-14, -7);

  const total = last7.reduce((s, d) => s + d.spend, 0);
  const prevTotal = prev7.reduce((s, d) => s + d.spend, 0);

  let bestDay: WeeklyDigest["bestDay"] = null;
  let worstDay: WeeklyDigest["worstDay"] = null;
  for (const day of last7) {
    if (!bestDay || day.spend < bestDay.spend) {
      bestDay = { date: day.date, spend: day.spend };
    }
    if (!worstDay || day.spend > worstDay.spend) {
      worstDay = { date: day.date, spend: day.spend };
    }
  }

  const windowKeys = new Set(last7.map((d) => d.dateKey));
  const byCategory = new Map<
    string,
    { name: string; emoji: string; color: string; amount: number }
  >();
  for (const t of transactions) {
    if (!isSpendWidgetExpense(t)) continue;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!windowKeys.has(key)) continue;
    const catId = t.categoryId?._id || "unknown";
    const existing = byCategory.get(catId);
    if (existing) {
      existing.amount += t.amount;
    } else {
      byCategory.set(catId, {
        name: t.categoryId?.name || "Unknown",
        emoji: t.categoryId?.emoji || "📦",
        color: t.categoryId?.color || "#6366f1",
        amount: t.amount,
      });
    }
  }
  const top = [...byCategory.values()].sort((a, b) => b.amount - a.amount)[0];

  return {
    total,
    prevTotal,
    pctChange: prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null,
    avgPerDay: last7.length > 0 ? total / last7.length : 0,
    bestDay,
    worstDay,
    topCategory: top
      ? { ...top, share: total > 0 ? (top.amount / total) * 100 : 0 }
      : null,
    days: last7.map((d) => ({ date: d.date, spend: d.spend })),
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
  transactions: TransactionType[];
  dailySeries: SpendWidgetDay[];
  totalDebt: number;
  referenceDate?: Date;
}): HealthResult {
  const { transactions, dailySeries, totalDebt } = params;
  const now = params.referenceDate ?? new Date();
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
  let savingsSpend = 0;

  for (const t of transactions) {
    const d = new Date(t.date);
    const offset = (year - d.getFullYear()) * 12 + (month - d.getMonth());
    if (t.type === "income") {
      yearIncome += t.amount;
      if (offset === 0) currentIncome += t.amount;
      else if (offset >= 1 && offset <= 3) prevIncomes[offset - 1] += t.amount;
    } else {
      yearExpense += t.amount;
      const bt = t.categoryId?.budgetType;
      if (bt === "needs") needsSpend += t.amount;
      else if (bt === "wants") wantsSpend += t.amount;
      else if (bt === "savings") savingsSpend += t.amount;
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

  // 3. Savings rate — year to date
  let savingsScore = 50;
  let savingsDetail = "No income recorded";
  if (yearIncome > 0) {
    const rate = (yearIncome - yearExpense) / yearIncome;
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

  // 5. Budget adherence — 50/30/20 split
  let budgetScore = 50;
  let budgetDetail = "No expenses recorded";
  const splitTotal = needsSpend + wantsSpend + savingsSpend;
  if (splitTotal > 0 && yearIncome > 0) {
    const needsRatio = (needsSpend / yearIncome) * 100;
    const wantsRatio = (wantsSpend / yearIncome) * 100;
    const savingsRatio = (savingsSpend / yearIncome) * 100;
    const avgDiff =
      (Math.abs(needsRatio - 50) +
        Math.abs(wantsRatio - 30) +
        Math.abs(savingsRatio - 20)) /
      3;
    budgetScore = clamp(100 - avgDiff * 3);
    budgetDetail = `${avgDiff.toFixed(0)}pt average drift from 50/30/20`;
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
