"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  Anchor,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useAppData } from "@/lib/AppDataContext";
import { format } from "date-fns";
import ActivityGrid from "@/components/ActivityGrid";
import BudgetDonut from "@/components/BudgetDonut";
import SpendStreakCard from "@/components/SpendStreakCard";

const NUM_BARS = 14;
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toLocalDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Home() {
  const { transactions, settings, year } = useAppData();
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);

  // ─── Derived balance from calibration ─────────────────────────────
  const calibratedBalance = settings?.currentBalance || 0;
  const balanceDate = settings?.balanceDate
    ? new Date(settings.balanceDate)
    : new Date();
  const taxDebt = settings?.taxDebt || 0;
  const creditDebt = settings?.creditDebt || 0;
  const totalDebt = taxDebt + creditDebt;

  const sorted = useMemo(
    () =>
      [...transactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [transactions],
  );

  // Compute balance at Jan 1 from calibration point
  const balanceAtJan1 = useMemo(() => {
    const jan1 = new Date(year, 0, 1);
    let delta = 0;
    for (const tx of sorted) {
      const d = new Date(tx.date);
      if (d < jan1) continue;
      if (d > balanceDate) break;
      delta += tx.type === "income" ? tx.amount : -tx.amount;
    }
    return calibratedBalance - delta;
  }, [sorted, calibratedBalance, balanceDate, year]);

  // Balance line chart data (daily running balance)
  const balanceLineData = useMemo(() => {
    const points: { date: string; balance: number; label: string }[] = [];
    let running = balanceAtJan1;

    const byDate = new Map<string, number>();
    for (const tx of sorted) {
      const key = new Date(tx.date).toISOString().split("T")[0];
      byDate.set(
        key,
        (byDate.get(key) || 0) +
          (tx.type === "income" ? tx.amount : -tx.amount),
      );
    }

    const jan1Key = `${year}-01-01`;
    if (!byDate.has(jan1Key)) {
      points.push({ date: jan1Key, balance: running, label: "Jan 1" });
    }

    const sortedDates = [...byDate.keys()].sort();
    for (const dateKey of sortedDates) {
      running += byDate.get(dateKey)!;
      const d = new Date(dateKey);
      points.push({
        date: dateKey,
        balance: Math.round(running * 100) / 100,
        label: `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`,
      });
    }

    const todayKey = new Date().toISOString().split("T")[0];
    if (
      year === new Date().getFullYear() &&
      !byDate.has(todayKey) &&
      sortedDates.length > 0
    ) {
      points.push({ date: todayKey, balance: running, label: "Today" });
    }

    return points;
  }, [sorted, balanceAtJan1, year]);

  const currentDerivedBalance =
    balanceLineData.length > 0
      ? balanceLineData[balanceLineData.length - 1].balance
      : calibratedBalance;
  const aboveWater = currentDerivedBalance - totalDebt;

  // ─── Daily spend bars (last NUM_BARS days) ─────────────────────────
  const dailyBars = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const bars: {
      date: Date;
      spend: number;
      segments: { amount: number }[];
      txs: typeof transactions;
      isToday: boolean;
      dayLabel: string;
    }[] = [];

    for (let i = NUM_BARS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = toLocalDateKey(d);
      const dayTxs = transactions.filter((t) => {
        const txD = new Date(t.date);
        return (
          toLocalDateKey(txD) === key &&
          t.type === "expense" &&
          !t.recurringPaymentId
        );
      });
      const segments = dayTxs.map((t) => ({ amount: t.amount }));
      bars.push({
        date: d,
        spend: dayTxs.reduce((s, t) => s + t.amount, 0),
        segments,
        txs: dayTxs,
        isToday: i === 0,
        dayLabel: dayNames[d.getDay()],
      });
    }
    return bars;
  }, [transactions]);

  const maxSpend = Math.max(...dailyBars.map((b) => b.spend), 1);

  const { todaySpend, currentSpendStreak, bestSpendStreak, targetSpend } =
    useMemo(() => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const jan1 = new Date(year, 0, 1);
      const endDate =
        year === now.getFullYear() ? today : new Date(year, 11, 31);

      const dailySpend = new Map<string, number>();
      for (const transaction of transactions) {
        if (transaction.type !== "expense" || transaction.recurringPaymentId) {
          continue;
        }

        const date = new Date(transaction.date);
        const key = toLocalDateKey(date);
        dailySpend.set(key, (dailySpend.get(key) || 0) + transaction.amount);
      }

      let totalSpend = 0;
      let dayCount = 0;
      let streak = 0;
      let maxStreak = 0;
      let spendToday = 0;

      const cursor = new Date(jan1);
      while (cursor <= endDate) {
        const key = toLocalDateKey(cursor);
        const spend = dailySpend.get(key) || 0;
        const avg = dayCount > 0 ? totalSpend / dayCount : 0;
        const isGood = dayCount > 0 && spend < avg;

        if (isGood) {
          streak++;
          if (streak > maxStreak) {
            maxStreak = streak;
          }
        } else {
          streak = 0;
        }

        if (cursor.getTime() === today.getTime()) {
          spendToday = spend;
        }

        totalSpend += spend;
        dayCount++;
        cursor.setDate(cursor.getDate() + 1);
      }

      return {
        todaySpend: spendToday,
        currentSpendStreak: streak,
        bestSpendStreak: maxStreak,
        targetSpend: dayCount > 0 ? totalSpend / dayCount : 0,
      };
    }, [transactions, year]);

  // ─── Rolling 7-day comparison ──────────────────────────────────────
  const { last7Spend, prev7Spend, pctChange7 } = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const start7 = new Date(now);
    start7.setDate(start7.getDate() - 6);
    start7.setHours(0, 0, 0, 0);

    const end14 = new Date(start7);
    end14.setMilliseconds(-1);
    const start14 = new Date(end14);
    start14.setDate(start14.getDate() - 6);
    start14.setHours(0, 0, 0, 0);

    let r7 = 0;
    let p7 = 0;
    for (const t of transactions) {
      if (t.type !== "expense" || t.recurringPaymentId) continue;
      const d = new Date(t.date);
      if (d >= start7 && d <= now) r7 += t.amount;
      if (d >= start14 && d <= end14) p7 += t.amount;
    }

    const pct = p7 > 0 ? ((r7 - p7) / p7) * 100 : 0;
    return { last7Spend: r7, prev7Spend: p7, pctChange7: pct };
  }, [transactions]);

  // ─── Monthly income vs expense (for charts) ───────────────────────
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: MONTH_SHORT[i],
      income: 0,
      expense: 0,
      net: 0,
    }));
    for (const tx of sorted) {
      const m = new Date(tx.date).getMonth();
      if (tx.type === "income") months[m].income += tx.amount;
      else months[m].expense += tx.amount;
    }
    months.forEach((m) => (m.net = m.income - m.expense));
    if (year === new Date().getFullYear()) {
      return months.slice(0, new Date().getMonth() + 1);
    }
    return months;
  }, [sorted, year]);

  // ─── Current month summary ─────────────────────────────────────────
  const currentMonth = new Date().getMonth();
  const monthTxs = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === year;
      }),
    [transactions, currentMonth, year],
  );
  const totalIncome = monthTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const monthBalance = totalIncome - totalExpense;

  // ─── Year totals ──────────────────────────────────────────────────
  const yearIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const yearExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const yearNet = yearIncome - yearExpense;
  const savingsRate = yearIncome > 0 ? (yearNet / yearIncome) * 100 : 0;

  // Budget splits
  const needsSpend = transactions
    .filter((t) => t.type === "expense" && t.categoryId?.budgetType === "needs")
    .reduce((s, t) => s + t.amount, 0);
  const wantsSpend = transactions
    .filter((t) => t.type === "expense" && t.categoryId?.budgetType === "wants")
    .reduce((s, t) => s + t.amount, 0);
  const savingsSpend = transactions
    .filter(
      (t) => t.type === "expense" && t.categoryId?.budgetType === "savings",
    )
    .reduce((s, t) => s + t.amount, 0);

  // Category breakdown
  const spendByCategory: Record<
    string,
    { name: string; emoji: string; color: string; amount: number }
  > = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const catId = t.categoryId?._id || "unknown";
      if (!spendByCategory[catId]) {
        spendByCategory[catId] = {
          name: t.categoryId?.name || "Unknown",
          emoji: t.categoryId?.emoji || "📦",
          color: t.categoryId?.color || "#6366f1",
          amount: 0,
        };
      }
      spendByCategory[catId].amount += t.amount;
    });
  const sortedCategories = Object.values(spendByCategory).sort(
    (a, b) => b.amount - a.amount,
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* 1. Current Balance + Above/Below Water */}
      <motion.div
        variants={itemVariants}
        className={`p-4 rounded-2xl border ${
          aboveWater >= 0
            ? "bg-emerald-500/5 border-emerald-500/20"
            : "bg-red-500/5 border-red-500/20"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Current Balance
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {aboveWater >= 0 ? (
              <Anchor className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className="text-xs text-muted-foreground">
              {aboveWater >= 0 ? "Above Water" : "Below Water"}
            </span>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold">
            {formatCurrency(currentDerivedBalance)}
          </div>
          <div
            className={`text-3xl font-bold ${aboveWater >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            {formatCurrency(aboveWater)}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Calibrated</span>
            <div className="font-medium">
              {formatCurrency(calibratedBalance)}
            </div>
            {settings?.balanceDate && (
              <div className="text-[9px] text-muted-foreground/50">
                {format(new Date(settings.balanceDate), "MMM d")}
              </div>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Tax Debt</span>
            <div className="font-medium text-red-400">
              {formatCurrency(taxDebt)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Credit Debt</span>
            <div className="font-medium text-red-400">
              {formatCurrency(creditDebt)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Daily Spend Target + Streaks */}
      <motion.div variants={itemVariants}>
        <SpendStreakCard
          todaySpend={todaySpend}
          targetSpend={targetSpend}
          currentStreak={currentSpendStreak}
          bestStreak={bestSpendStreak}
        />
      </motion.div>

      {/* 3. GitHub-style Activity Grid */}
      <motion.div variants={itemVariants}>
        <ActivityGrid transactions={transactions} year={year} />
      </motion.div>

      {/* 4. Non-recurring Spend Bars */}
      <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Last 7 days · non-recurring
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(last7Spend)}
            </div>
          </div>
          <div className="text-right">
            {prev7Spend > 0 && (
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  pctChange7 <= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {pctChange7 <= 0 ? (
                  <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUp className="w-3 h-3" />
                )}
                {Math.abs(pctChange7).toFixed(0)}% vs prior 7 days
              </div>
            )}
          </div>
        </div>

        <div className="flex items-end gap-[3px] mt-3" style={{ height: 110 }}>
          {dailyBars.map((bar, i) => {
            const heightPct =
              bar.spend > 0 ? (bar.spend / maxSpend) * 65 + 5 : 2;
            const isSelected = selectedBarIdx === i;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
                style={{ height: "100%" }}
                onClick={() => setSelectedBarIdx(isSelected ? null : i)}
              >
                {bar.spend > 0 && (
                  <span className="text-[7px] text-muted-foreground leading-none whitespace-nowrap">
                    {bar.spend >= 1000
                      ? `${(bar.spend / 1000).toFixed(1)}k`
                      : Math.round(bar.spend)}
                  </span>
                )}
                <div className="flex-1 flex items-end w-full">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.03 }}
                    className={`w-full rounded-t-sm overflow-hidden flex flex-col-reverse gap-[2px] ${
                      bar.isToday
                        ? "opacity-30"
                        : bar.spend === 0
                          ? "bg-muted-foreground/10"
                          : ""
                    } ${isSelected ? "ring-1 ring-primary/50" : ""}`}
                  >
                    {bar.segments.map((seg, j) => (
                      <div
                        key={j}
                        className={`w-full rounded-[1px] ${
                          bar.isToday ? "bg-muted-foreground" : "bg-primary"
                        }`}
                        style={{ flexGrow: seg.amount }}
                      />
                    ))}
                  </motion.div>
                </div>
                <span className="text-[8px] text-muted-foreground leading-none">
                  {bar.dayLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* Day drawer */}
        <AnimatePresence>
          {selectedBarIdx !== null && dailyBars[selectedBarIdx] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {format(dailyBars[selectedBarIdx].date, "EEEE, MMM d")}
                  </span>
                  <button
                    onClick={() => setSelectedBarIdx(null)}
                    className="p-1 rounded-md hover:bg-secondary text-muted-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {dailyBars[selectedBarIdx].txs.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-3">
                    No non-recurring expenses
                  </div>
                ) : (
                  dailyBars[selectedBarIdx].txs.map((tx) => (
                    <div
                      key={tx._id}
                      className="flex items-center gap-2.5 p-2.5 bg-secondary/50 rounded-xl"
                    >
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                        style={{
                          backgroundColor:
                            (tx.categoryId?.color || "#6366f1") + "20",
                        }}
                      >
                        {tx.categoryId?.emoji || "📦"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {tx.description || tx.categoryId?.name || "Unknown"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {tx.categoryId?.name}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-red-400 flex items-center gap-1">
                        <ArrowDownCircle className="w-3 h-3" />
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 5. Month Income / Expenses / Balance */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between p-3 bg-card rounded-xl"
      >
        <div className="text-center flex-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Income
          </div>
          <div className="text-sm font-semibold text-emerald-400">
            {formatCurrency(totalIncome)}
          </div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center flex-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Expenses
          </div>
          <div className="text-sm font-semibold text-red-400">
            {formatCurrency(totalExpense)}
          </div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center flex-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Balance
          </div>
          <div
            className={`text-sm font-semibold ${monthBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            {formatCurrency(monthBalance)}
          </div>
        </div>
      </motion.div>

      {/* 6. Yearly Balance Chart */}
      {balanceLineData.length > 1 && (
        <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
            Balance — {year}
          </div>
          <div className="h-48 -mx-2 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceLineData}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`}
                />
                <ReferenceLine y={0} stroke="#a1a1aa" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#balGrad)"
                  dot={false}
                  activeDot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* 7. Monthly Income vs Expenses */}
      {monthlyData.length > 0 && (
        <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
            Monthly Income vs Expenses
          </div>
          <div className="h-40 -mx-2 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={2}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                  tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`}
                />
                <Bar
                  dataKey="income"
                  fill="#22c55e"
                  radius={[3, 3, 0, 0]}
                  name="Income"
                />
                <Bar
                  dataKey="expense"
                  fill="#ef4444"
                  radius={[3, 3, 0, 0]}
                  name="Expenses"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* 7. Year Summary Cards (Income / Expense / Savings Rate) */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-card rounded-2xl text-center">
          <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <div className="text-[10px] text-muted-foreground">Year Income</div>
          <div className="text-sm font-bold text-emerald-400">
            {formatCurrency(yearIncome)}
          </div>
        </div>
        <div className="p-3 bg-card rounded-2xl text-center">
          <TrendingDown className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <div className="text-[10px] text-muted-foreground">Year Expense</div>
          <div className="text-sm font-bold text-red-400">
            {formatCurrency(yearExpense)}
          </div>
        </div>
        <div className="p-3 bg-card rounded-2xl text-center">
          <Wallet className="w-4 h-4 text-primary mx-auto mb-1" />
          <div className="text-[10px] text-muted-foreground">Savings Rate</div>
          <div
            className={`text-sm font-bold ${savingsRate >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            {savingsRate.toFixed(0)}%
          </div>
        </div>
      </motion.div>

      {/* 8. 50/30/20 Budget */}
      <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-4">
          50/30/20 Budget — {year}
        </div>
        <BudgetDonut
          needs={needsSpend}
          wants={wantsSpend}
          savings={savingsSpend}
          totalIncome={yearIncome}
        />
      </motion.div>

      {/* 9. Spending by Category */}
      {sortedCategories.length > 0 && (
        <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
            Spending by Category — {year}
          </div>
          <div className="space-y-2">
            {sortedCategories.map((cat) => {
              const pct =
                yearExpense > 0 ? (cat.amount / yearExpense) * 100 : 0;
              return (
                <div key={cat.name} className="flex items-center gap-3 text-sm">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: cat.color + "20" }}
                  >
                    {cat.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <span className="truncate">{cat.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">
                        {formatCurrency(cat.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: cat.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right shrink-0">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
