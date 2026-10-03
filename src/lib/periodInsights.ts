import type { CategoryType, TransactionType } from "@/lib/types";
import {
  type CategoryIndex,
  isTaxPayment,
  resolveCategory,
  rootOf,
} from "@/lib/categories";
import {
  MONTH_NAMES,
  monthKey,
  shiftMonthKey,
  txDateKey,
  txMonthKey,
  daysInMonthKey,
} from "@/lib/dates";
import { computeTaxYear, type TaxRates, type TaxYearSummary } from "@/lib/tax";
import { formatCurrency } from "@/lib/utils";

// ─── Periods ─────────────────────────────────────────────────────────

export type PeriodKind = "month" | "quarter" | "year";

export interface Period {
  kind: PeriodKind;
  year: number;
  index: number; // month 0-11, quarter 0-3, or 0 for year
}

export function periodOf(kind: PeriodKind, date: Date): Period {
  const month = date.getMonth();
  return {
    kind,
    year: date.getFullYear(),
    index: kind === "month" ? month : kind === "quarter" ? Math.floor(month / 3) : 0,
  };
}

export function periodMonths(period: Period): string[] {
  if (period.kind === "month") return [monthKey(period.year, period.index)];
  if (period.kind === "quarter") {
    const start = period.index * 3;
    return [0, 1, 2].map((i) => monthKey(period.year, start + i));
  }
  return Array.from({ length: 12 }, (_, i) => monthKey(period.year, i));
}

export function shiftPeriod(period: Period, delta: number): Period {
  if (period.kind === "year") return { ...period, year: period.year + delta };
  const size = period.kind === "month" ? 12 : 4;
  const total = period.year * size + period.index + delta;
  return {
    kind: period.kind,
    year: Math.floor(total / size),
    index: ((total % size) + size) % size,
  };
}

export function periodLabel(period: Period) {
  if (period.kind === "month") return `${MONTH_NAMES[period.index]} ${period.year}`;
  if (period.kind === "quarter") return `Q${period.index + 1} ${period.year}`;
  return String(period.year);
}

// ─── Stats ───────────────────────────────────────────────────────────

export type SpendFilter =
  | "all"
  | "needs"
  | "wants"
  | "oneoff"
  | "bills"
  | "writeoffs";

export function matchesSpendFilter(
  t: TransactionType,
  filter: SpendFilter,
  index: CategoryIndex,
) {
  if (filter === "all") return true;
  if (filter === "oneoff") return !t.recurringPaymentId;
  if (filter === "bills") return Boolean(t.recurringPaymentId);
  if (filter === "writeoffs") return t.isWriteOff;
  return resolveCategory(t.categoryId, index)?.budgetType === filter;
}

export interface CategoryBreakdown {
  category: CategoryType;
  amount: number;
  previous: number;
  count: number;
  children: { category: CategoryType; amount: number; count: number }[];
  direct: number; // spent on the parent itself ("General")
}

export interface DescriptionTotal {
  description: string;
  amount: number;
  count: number;
  emoji: string;
}

export interface PeriodStats {
  months: string[];
  days: number;
  income: number;
  incomeByCategory: { category: CategoryType; amount: number; bruto: number }[];
  spent: number; // every expense except tax payments
  filteredSpent: number;
  previousFilteredSpent: number;
  taxOwed: number;
  taxPaid: number;
  kept: number;
  needs: number;
  wants: number;
  obligations: number;
  bills: number;
  oneOff: number;
  writeOffs: number;
  writeOffItems: TransactionType[];
  breakdown: CategoryBreakdown[];
  topDescriptions: DescriptionTotal[];
  biggest: TransactionType[];
}

function elapsedDays(months: string[], todayKey: string) {
  let days = 0;
  for (const key of months) {
    const inMonth = daysInMonthKey(key);
    if (todayKey.slice(0, 7) === key) days += Number(todayKey.slice(8, 10));
    else if (key < todayKey.slice(0, 7)) days += inMonth;
  }
  return Math.max(days, 1);
}

export function computePeriodStats(params: {
  transactions: TransactionType[];
  period: Period;
  index: CategoryIndex;
  rates: TaxRates;
  filter: SpendFilter;
  todayKey: string;
}): PeriodStats {
  const { transactions, period, index, rates, filter, todayKey } = params;
  const months = periodMonths(period);
  const monthSet = new Set(months);
  const previousMonthList = periodMonths(shiftPeriod(period, -1));
  const previousMonths = new Set(previousMonthList);

  // While a period is still running, compare it with the same number of
  // days from the start of the previous period, not the whole of it.
  let previousCutoff: string | null = null;
  if (monthSet.has(todayKey.slice(0, 7))) {
    const start = new Date(`${months[0]}-01T00:00:00Z`);
    const today = new Date(`${todayKey}T00:00:00Z`);
    const elapsed = Math.round((today.getTime() - start.getTime()) / 86400000);
    const previousStart = new Date(`${previousMonthList[0]}-01T00:00:00Z`);
    previousStart.setUTCDate(previousStart.getUTCDate() + elapsed);
    previousCutoff = previousStart.toISOString().slice(0, 10);
  }

  const taxYears = new Map<number, TaxYearSummary>();
  const taxYear = (y: number) => {
    let summary = taxYears.get(y);
    if (!summary) {
      summary = computeTaxYear(transactions, y, index, rates);
      taxYears.set(y, summary);
    }
    return summary;
  };
  const taxOwed = months.reduce((s, key) => {
    const [y, m] = key.split("-").map(Number);
    return s + taxYear(y).months[m - 1].total;
  }, 0);

  let income = 0;
  let spent = 0;
  let filteredSpent = 0;
  let previousFilteredSpent = 0;
  let taxPaid = 0;
  let needs = 0;
  let wants = 0;
  let obligations = 0;
  let bills = 0;
  let writeOffs = 0;
  const writeOffItems: TransactionType[] = [];
  const incomeByRoot = new Map<
    string,
    { category: CategoryType; amount: number; bruto: number }
  >();
  const byRoot = new Map<string, CategoryBreakdown>();
  const byDescription = new Map<string, DescriptionTotal>();
  const expenses: TransactionType[] = [];

  for (const t of transactions) {
    const key = txMonthKey(t.date);
    const inPeriod = monthSet.has(key);
    const inPrevious =
      previousMonths.has(key) &&
      (!previousCutoff || txDateKey(t.date) <= previousCutoff);
    if (!inPeriod && !inPrevious) continue;

    if (t.type === "income") {
      if (!inPeriod) continue;
      income += t.amount;
      const root = rootOf(t.categoryId, index);
      if (root) {
        const entry = incomeByRoot.get(root._id) ?? {
          category: root,
          amount: 0,
          bruto: 0,
        };
        entry.amount += t.amount;
        if (t.incomeType === "bruto") entry.bruto += t.amount;
        incomeByRoot.set(root._id, entry);
      }
      continue;
    }

    if (isTaxPayment(t, index)) {
      if (inPeriod) taxPaid += t.amount;
      continue;
    }

    const matches = matchesSpendFilter(t, filter, index);
    const root = rootOf(t.categoryId, index);

    if (inPrevious) {
      if (matches) previousFilteredSpent += t.amount;
      if (matches && root) {
        const entry = byRoot.get(root._id);
        if (entry) entry.previous += t.amount;
        else
          byRoot.set(root._id, {
            category: root,
            amount: 0,
            previous: t.amount,
            count: 0,
            children: [],
            direct: 0,
          });
      }
      continue;
    }

    spent += t.amount;
    const category = resolveCategory(t.categoryId, index);
    const type = category?.budgetType;
    if (type === "needs") needs += t.amount;
    else if (type === "wants") wants += t.amount;
    else if (type === "obligations") obligations += t.amount;
    if (t.recurringPaymentId) bills += t.amount;
    if (t.isWriteOff) {
      writeOffs += t.amount;
      writeOffItems.push(t);
    }

    if (!matches) continue;
    filteredSpent += t.amount;
    // Bills repeat every month; the lists below are about one-off choices.
    if (!t.recurringPaymentId) expenses.push(t);

    if (root && category) {
      const entry = byRoot.get(root._id) ?? {
        category: root,
        amount: 0,
        previous: 0,
        count: 0,
        children: [],
        direct: 0,
      };
      entry.amount += t.amount;
      entry.count++;
      if (category._id === root._id) {
        entry.direct += t.amount;
      } else {
        const child = entry.children.find((c) => c.category._id === category._id);
        if (child) {
          child.amount += t.amount;
          child.count++;
        } else {
          entry.children.push({ category, amount: t.amount, count: 1 });
        }
      }
      byRoot.set(root._id, entry);
    }

    const text = t.recurringPaymentId ? "" : t.description?.trim();
    if (text) {
      const normalized = text.toLowerCase();
      const entry = byDescription.get(normalized) ?? {
        description: text,
        amount: 0,
        count: 0,
        emoji: category?.emoji ?? "📦",
      };
      entry.amount += t.amount;
      entry.count++;
      byDescription.set(normalized, entry);
    }
  }

  const breakdown = [...byRoot.values()]
    .filter((b) => b.amount >= 0.5)
    .map((b) => ({
      ...b,
      children: b.children.sort((x, y) => y.amount - x.amount),
    }))
    .sort((a, b) => b.amount - a.amount || b.previous - a.previous);

  return {
    months,
    days: elapsedDays(months, todayKey),
    income,
    incomeByCategory: [...incomeByRoot.values()].sort((a, b) => b.amount - a.amount),
    spent,
    filteredSpent,
    previousFilteredSpent,
    taxOwed,
    taxPaid,
    kept: income - taxOwed - spent,
    needs,
    wants,
    obligations,
    bills,
    oneOff: spent - bills,
    writeOffs,
    writeOffItems: writeOffItems.sort((a, b) =>
      txDateKey(b.date).localeCompare(txDateKey(a.date)),
    ),
    breakdown,
    topDescriptions: [...byDescription.values()]
      .filter((d) => d.count > 1 || d.amount >= 50)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8),
    biggest: expenses.sort((a, b) => b.amount - a.amount).slice(0, 5),
  };
}

// ─── Monthly review ──────────────────────────────────────────────────

export interface ReviewLine {
  category: CategoryType;
  amount: number;
  usual: number;
  delta: number;
}

export interface MonthReview {
  monthKey: string;
  income: number;
  usualIncome: number;
  spent: number;
  usualSpent: number;
  kept: number;
  goal: number;
  lines: ReviewLine[]; // biggest changes vs the 3 months before
  suggestion: string | null;
}

export function computeMonthReview(params: {
  transactions: TransactionType[];
  monthKey: string;
  index: CategoryIndex;
  rates: TaxRates;
  goal: number;
}): MonthReview {
  const { transactions, monthKey: reviewed, index, rates, goal } = params;
  const before = [1, 2, 3].map((n) => shiftMonthKey(reviewed, -n));
  const beforeSet = new Set(before);

  const perRoot = new Map<string, { category: CategoryType; now: number; before: number }>();
  let income = 0;
  let incomeBefore = 0;
  let spent = 0;
  let spentBefore = 0;

  for (const t of transactions) {
    const key = txMonthKey(t.date);
    const isNow = key === reviewed;
    const isBefore = beforeSet.has(key);
    if (!isNow && !isBefore) continue;
    if (t.type === "income") {
      if (isNow) income += t.amount;
      else incomeBefore += t.amount;
      continue;
    }
    if (isTaxPayment(t, index)) continue;
    if (isNow) spent += t.amount;
    else spentBefore += t.amount;
    if (t.recurringPaymentId) continue; // bills don't move month to month
    const root = rootOf(t.categoryId, index);
    if (!root || root.budgetType === "obligations") continue;
    const entry = perRoot.get(root._id) ?? { category: root, now: 0, before: 0 };
    if (isNow) entry.now += t.amount;
    else entry.before += t.amount;
    perRoot.set(root._id, entry);
  }

  const [y, m] = reviewed.split("-").map(Number);
  const tax = computeTaxYear(transactions, y, index, rates).months[m - 1].total;
  const kept = income - tax - spent;

  const lines = [...perRoot.values()]
    .map((e) => ({
      category: e.category,
      amount: e.now,
      usual: e.before / 3,
      delta: e.now - e.before / 3,
    }))
    .filter((l) => l.amount > 0 || l.usual > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);

  let suggestion: string | null = null;
  const biggestOver = [...lines]
    .filter((l) => l.delta > 20)
    .sort((a, b) => b.delta - a.delta)[0];
  const gap = goal - kept;
  const usualSpent = spentBefore / 3;
  const usualIncome = incomeBefore / 3;
  if (biggestOver) {
    suggestion =
      gap > 0
        ? `${biggestOver.category.name} was ${formatCurrency(biggestOver.delta)} above your usual. Bringing it back to normal would cover ${Math.min(100, Math.round((biggestOver.delta / gap) * 100))}% of the gap to your goal.`
        : `${biggestOver.category.name} ran ${formatCurrency(biggestOver.delta)} above your usual. Worth a look, even though you hit the goal.`;
  } else if (gap > 0 && spent < usualSpent - 20) {
    suggestion = `You spent ${formatCurrency(usualSpent - spent)} less than usual. The gap came from income (${formatCurrency(income)} vs ${formatCurrency(usualIncome)} usually) and ${formatCurrency(tax)} tax set aside on bruto income.`;
  } else if (gap > 0) {
    const topUsual = [...lines].sort((a, b) => b.amount - a.amount)[0];
    if (topUsual) {
      suggestion = `Spending was close to usual. ${topUsual.category.name} is your biggest flexible category (${formatCurrency(topUsual.amount)}), so it's the easiest place to find the ${formatCurrency(gap)} gap.`;
    }
  }

  return {
    monthKey: reviewed,
    income,
    usualIncome: incomeBefore / 3,
    spent,
    usualSpent: spentBefore / 3,
    kept,
    goal,
    lines,
    suggestion,
  };
}
