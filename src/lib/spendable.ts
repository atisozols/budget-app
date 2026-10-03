import type {
  CategoryType,
  RecurringPaymentType,
  SettingsType,
  TransactionType,
} from "@/lib/types";
import { type CategoryIndex, isTaxPayment, rootOf } from "@/lib/categories";
import {
  daysInMonthKey,
  logicalToday,
  monthKeyOf,
  shiftMonthKey,
  toDateKey,
  txDateKey,
  txMonthKey,
} from "@/lib/dates";
import {
  computeTaxYear,
  type TaxMonth,
  type TaxRates,
  type TaxYearSummary,
} from "@/lib/tax";

// Spendable: how much is left to spend this month while still keeping the
// savings goal. Saving isn't a transaction — it's the headroom left over.
//
//   income received this month
//   + regular income still to come (conservative, see below)
//   − tax set aside on this month's bruto income
//   − savings goal
//   − this month's bills (paid + still due)
//   + carry-over (each earlier month's result vs the goal)
//   = spendable;  spendable − other spending so far = left

export interface MonthResult {
  monthKey: string;
  income: number;
  tax: number;
  spent: number; // every expense except tax payments
  kept: number; // income − tax − spent
  vsGoal: number; // kept − goal
}

// Regular income = a source (top-level income category) that paid in at
// least 2 of the last 3 months. It's counted at the lowest amount it paid in
// those months, so the plan never leans on a good month. Whatever has already
// arrived this month is subtracted; anything above the estimate is a bonus.
export interface ExpectedIncome {
  categoryId: string;
  name: string;
  emoji: string;
  /** Conservative monthly estimate for this source. */
  amount: number;
  received: number;
  /** Still to come this month (gross). */
  pending: number;
  /** Pending after the tax it will need. */
  afterTax: number;
  isBruto: boolean;
}

export interface SpendableResult {
  monthKey: string;
  goal: number;
  hasGoal: boolean;
  startMonth: string;
  /** Received + regular income still expected. */
  income: number;
  incomeReceived: number;
  incomePending: number;
  tax: TaxMonth;
  billsPaid: number;
  billsUnpaid: number;
  billsDue: number;
  unpaidBills: RecurringPaymentType[];
  carryOver: number;
  spendable: number;
  spent: number; // non-bill, non-tax spending this month
  left: number;
  perDay: number;
  /** Daily allowance as it stood at the start of today. */
  allowanceToday: number;
  spentToday: number;
  daysLeft: number;
  daysInMonth: number;
  dayOfMonth: number;
  keptSoFar: number;
  /** How far past the plan this month is (0 when within it). */
  overPlan: number;
  expected: ExpectedIncome[];
  history: MonthResult[]; // completed months since the goal started
}

function isRecurringActiveInMonth(p: RecurringPaymentType, monthKey: string) {
  if (!p.isActive) return false;
  if (!p.startDate) return true;
  return txMonthKey(p.startDate) <= monthKey;
}

export function computeSpendable(params: {
  transactions: TransactionType[];
  recurring: RecurringPaymentType[];
  settings: SettingsType | null;
  index: CategoryIndex;
  rates: TaxRates;
  now?: Date;
}): SpendableResult {
  const { transactions, recurring, settings, index, rates } = params;
  const today = logicalToday(params.now);
  const currentMonth = monthKeyOf(today);
  const goal = Math.max(0, settings?.savingsGoal ?? 0);
  let startMonth = settings?.savingsStartMonth || currentMonth;
  if (startMonth > currentMonth) startMonth = currentMonth;

  // ── Bucket transactions by month ───────────────────────────────────
  const byMonth = new Map<string, TransactionType[]>();
  for (const t of transactions) {
    const key = txMonthKey(t.date);
    if (key < startMonth && key < shiftMonthKey(currentMonth, -3)) continue;
    const list = byMonth.get(key) ?? [];
    list.push(t);
    byMonth.set(key, list);
  }

  const taxYears = new Map<number, TaxYearSummary>();
  const taxFor = (monthKey: string) => {
    const [y, m] = monthKey.split("-").map(Number);
    let summary = taxYears.get(y);
    if (!summary) {
      summary = computeTaxYear(transactions, y, index, rates);
      taxYears.set(y, summary);
    }
    return summary.months[m - 1];
  };

  const resultFor = (monthKey: string): MonthResult => {
    const list = byMonth.get(monthKey) ?? [];
    let income = 0;
    let spent = 0;
    for (const t of list) {
      if (t.type === "income") income += t.amount;
      else if (!isTaxPayment(t, index)) spent += t.amount;
    }
    const tax = taxFor(monthKey).total;
    const kept = income - tax - spent;
    return { monthKey, income, tax, spent, kept, vsGoal: kept - goal };
  };

  // ── Carry-over from completed months since the goal started ────────
  const history: MonthResult[] = [];
  let carryOver = 0;
  for (let key = startMonth; key < currentMonth; key = shiftMonthKey(key, 1)) {
    const result = resultFor(key);
    history.push(result);
    carryOver += result.vsGoal;
  }

  // ── This month ─────────────────────────────────────────────────────
  const monthTxs = byMonth.get(currentMonth) ?? [];
  let income = 0;
  let billsPaid = 0;
  let spent = 0;
  let spentToday = 0;
  let allSpending = 0;
  const todayKey = toDateKey(today);
  const paidRecurringIds = new Set<string>();
  for (const t of monthTxs) {
    if (t.type === "income") {
      income += t.amount;
      continue;
    }
    if (isTaxPayment(t, index)) continue;
    allSpending += t.amount;
    if (t.recurringPaymentId) {
      billsPaid += t.amount;
      paidRecurringIds.add(String(t.recurringPaymentId));
    } else {
      spent += t.amount;
      if (txDateKey(t.date) === todayKey) spentToday += t.amount;
    }
  }

  const unpaidBills = recurring.filter(
    (p) =>
      isRecurringActiveInMonth(p, currentMonth) && !paidRecurringIds.has(p._id),
  );
  const billsUnpaid = unpaidBills.reduce((s, p) => s + p.amount, 0);
  const billsDue = billsPaid + billsUnpaid;

  // ── Regular income still to come ───────────────────────────────────
  const receivedByRoot = new Map<string, number>();
  for (const t of monthTxs) {
    if (t.type !== "income") continue;
    const root = rootOf(t.categoryId, index);
    if (root) receivedByRoot.set(root._id, (receivedByRoot.get(root._id) ?? 0) + t.amount);
  }
  const lookback = [1, 2, 3].map((n) => shiftMonthKey(currentMonth, -n));
  const perRoot = new Map<
    string,
    {
      category: CategoryType;
      months: Map<string, number>;
      bruto: number;
      total: number;
    }
  >();
  for (const t of transactions) {
    if (t.type !== "income") continue;
    const key = txMonthKey(t.date);
    if (!lookback.includes(key)) continue;
    const root = rootOf(t.categoryId, index);
    if (!root) continue;
    const entry = perRoot.get(root._id) ?? {
      category: root,
      months: new Map<string, number>(),
      bruto: 0,
      total: 0,
    };
    entry.months.set(key, (entry.months.get(key) ?? 0) + t.amount);
    entry.total += t.amount;
    if (t.incomeType === "bruto") entry.bruto += t.amount;
    perRoot.set(root._id, entry);
  }

  const expected: ExpectedIncome[] = [];
  const pendingBruto: TransactionType[] = [];
  for (const [categoryId, entry] of perRoot) {
    if (entry.months.size < 2) continue;
    const amount = Math.min(...entry.months.values());
    const received = receivedByRoot.get(categoryId) ?? 0;
    const pending = Math.max(0, amount - received);
    if (pending < 1) continue;
    const isBruto = entry.bruto > entry.total / 2;
    if (isBruto) {
      pendingBruto.push({
        _id: `expected-${categoryId}`,
        amount: pending,
        type: "income",
        incomeType: "bruto",
        categoryId: entry.category,
        description: "",
        date: `${todayKey}T00:00:00.000Z`,
        tags: [],
        isWriteOff: false,
        createdAt: new Date().toISOString(),
      });
    }
    expected.push({
      categoryId,
      name: entry.category.name,
      emoji: entry.category.emoji,
      amount,
      received,
      pending,
      afterTax: pending,
      isBruto,
    });
  }
  expected.sort((a, b) => b.pending - a.pending);
  const incomePending = expected.reduce((s, e) => s + e.pending, 0);

  // Tax for this month as if the expected bruto income had arrived.
  const receivedTax = taxFor(currentMonth);
  const tax =
    pendingBruto.length > 0
      ? computeTaxYear(
          [...transactions, ...pendingBruto],
          today.getFullYear(),
          index,
          rates,
        ).months[today.getMonth()]
      : receivedTax;
  const taxOnPending = tax.total - receivedTax.total;
  const pendingBrutoTotal = pendingBruto.reduce((s, t) => s + t.amount, 0);
  for (const e of expected) {
    if (e.isBruto && pendingBrutoTotal > 0) {
      e.afterTax = e.pending - (e.pending / pendingBrutoTotal) * taxOnPending;
    }
  }

  const totalIncome = income + incomePending;
  const spendable = totalIncome - tax.total - goal - billsDue + carryOver;
  const left = spendable - spent;
  const daysInMonth = daysInMonthKey(currentMonth);
  const dayOfMonth = today.getDate();
  const daysLeft = daysInMonth - dayOfMonth + 1;

  return {
    monthKey: currentMonth,
    goal,
    hasGoal: goal > 0,
    startMonth,
    income: totalIncome,
    incomeReceived: income,
    incomePending,
    tax,
    billsPaid,
    billsUnpaid,
    billsDue,
    unpaidBills,
    carryOver,
    spendable,
    spent,
    left,
    perDay: left > 0 ? left / daysLeft : 0,
    allowanceToday: Math.max(0, (left + spentToday) / daysLeft),
    spentToday,
    daysLeft,
    daysInMonth,
    dayOfMonth,
    keptSoFar: income - receivedTax.total - allSpending,
    overPlan: Math.max(0, -left),
    expected,
    history,
  };
}
