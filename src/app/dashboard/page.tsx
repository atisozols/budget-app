"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Anchor,
  Wallet,
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
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatCurrency, getHealthScore } from "@/lib/utils";
import { TransactionType, SettingsType } from "@/lib/types";
import HealthScore from "@/components/HealthScore";
import BudgetDonut from "@/components/BudgetDonut";
import { useMonth } from "@/lib/MonthContext";

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

export default function DashboardPage() {
  const { year } = useMonth();
  const [yearTxs, setYearTxs] = useState<TransactionType[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/transactions?year=${year}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([txs, s]) => {
        setYearTxs(txs);
        setSettings(s);
      })
      .catch(console.error);
  }, [year]);

  // ─── Derived data ────────────────────────────────────────────────
  const calibratedBalance = settings?.currentBalance || 0;
  const balanceDate = settings?.balanceDate
    ? new Date(settings.balanceDate)
    : new Date();
  const taxDebt = settings?.taxDebt || 0;
  const creditDebt = settings?.creditDebt || 0;
  const totalDebt = taxDebt + creditDebt;

  // Sort ascending for running balance
  const sorted = useMemo(
    () =>
      [...yearTxs].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [yearTxs],
  );

  // ─── Compute balance at Jan 1 from calibration point ─────────────
  const balanceAtJan1 = useMemo(() => {
    // Transactions between Jan 1 and balanceDate adjust the starting point
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

  // ─── Balance line chart data (daily running balance) ─────────────
  const balanceLineData = useMemo(() => {
    const points: { date: string; balance: number; label: string }[] = [];
    let running = balanceAtJan1;

    // Group transactions by date
    const byDate = new Map<string, number>();
    for (const tx of sorted) {
      const key = new Date(tx.date).toISOString().split("T")[0];
      byDate.set(
        key,
        (byDate.get(key) || 0) +
          (tx.type === "income" ? tx.amount : -tx.amount),
      );
    }

    // Add Jan 1 starting point
    const jan1Key = `${year}-01-01`;
    if (!byDate.has(jan1Key)) {
      points.push({ date: jan1Key, balance: running, label: "Jan 1" });
    }

    // Walk through each date with transactions
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

    // Add today if not already there
    const todayKey = new Date().toISOString().split("T")[0];
    if (
      year === new Date().getFullYear() &&
      !byDate.has(todayKey) &&
      sortedDates.length > 0
    ) {
      points.push({
        date: todayKey,
        balance: running,
        label: "Today",
      });
    }

    return points;
  }, [sorted, balanceAtJan1, year]);

  const currentDerivedBalance =
    balanceLineData.length > 0
      ? balanceLineData[balanceLineData.length - 1].balance
      : calibratedBalance;
  const aboveWater = currentDerivedBalance - totalDebt;

  // ─── Monthly income vs expense bars ──────────────────────────────
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
    // Only show up to current month if current year
    if (year === new Date().getFullYear()) {
      return months.slice(0, new Date().getMonth() + 1);
    }
    return months;
  }, [sorted, year]);

  // ─── Year totals ─────────────────────────────────────────────────
  const yearIncome = yearTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const yearExpense = yearTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const yearNet = yearIncome - yearExpense;
  const savingsRate = yearIncome > 0 ? (yearNet / yearIncome) * 100 : 0;

  // Budget splits
  const needsSpend = yearTxs
    .filter((t) => t.type === "expense" && t.categoryId?.budgetType === "needs")
    .reduce((s, t) => s + t.amount, 0);
  const wantsSpend = yearTxs
    .filter((t) => t.type === "expense" && t.categoryId?.budgetType === "wants")
    .reduce((s, t) => s + t.amount, 0);
  const savingsSpend = yearTxs
    .filter(
      (t) => t.type === "expense" && t.categoryId?.budgetType === "savings",
    )
    .reduce((s, t) => s + t.amount, 0);

  // Health score
  const avgMonthIncome = yearIncome / (monthlyData.length || 1);
  const avgMonthExpense = yearExpense / (monthlyData.length || 1);
  const healthData = getHealthScore({
    balance: currentDerivedBalance,
    totalDebt,
    needsRatio: yearExpense > 0 ? (needsSpend / yearExpense) * 100 : 50,
    wantsRatio: yearExpense > 0 ? (wantsSpend / yearExpense) * 100 : 30,
    savingsRatio: yearExpense > 0 ? (savingsSpend / yearExpense) * 100 : 20,
    monthlyIncome: avgMonthIncome,
    monthlyExpenses: avgMonthExpense,
  });

  // Category breakdown (year)
  const spendByCategory: Record<
    string,
    { name: string; emoji: string; color: string; amount: number }
  > = {};
  yearTxs
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
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BalanceTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
        <div className="text-muted-foreground">
          {payload[0]?.payload?.label}
        </div>
        <div className="font-semibold">{formatCurrency(payload[0]?.value)}</div>
      </div>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
        <div className="font-medium mb-1">{label}</div>
        {payload.map((p: { name: string; value: number; color: string }) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-medium">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Current Balance + Above Water */}
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
            className={`text-lg font-semibold ${aboveWater >= 0 ? "text-emerald-400" : "text-red-400"}`}
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

      {/* Balance Line Graph */}
      {balanceLineData.length > 1 && (
        <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Balance — {year}
          </h3>
          <div className="h-48 -mx-2">
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
                <Tooltip content={<BalanceTooltip />} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#balGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#6366f1" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Monthly Income vs Expenses */}
      {monthlyData.length > 0 && (
        <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Monthly Income vs Expenses
          </h3>
          <div className="h-40 -mx-2">
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
                <Tooltip content={<BarTooltip />} />
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

      {/* Year Summary Cards */}
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

      {/* Monthly Net Savings Sparkline */}
      {monthlyData.length > 1 && (
        <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Monthly Net (Income − Expenses)
          </h3>
          <div className="h-32 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
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
                  tickFormatter={(v) =>
                    `€${v >= 0 ? "+" : ""}${(v / 1000).toFixed(1)}k`
                  }
                />
                <ReferenceLine y={0} stroke="#a1a1aa" strokeDasharray="4 4" />
                <Tooltip content={<BarTooltip />} />
                <Bar
                  dataKey="net"
                  name="Net"
                  radius={[3, 3, 0, 0]}
                  fill="#6366f1"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  shape={(props: any) => {
                    const { x, y, width, height, payload } = props;
                    const fill = payload.net >= 0 ? "#22c55e" : "#ef4444";
                    return (
                      <rect
                        x={x}
                        y={payload.net >= 0 ? y : y}
                        width={width}
                        height={Math.abs(height)}
                        fill={fill}
                        rx={3}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Health Score */}
      <motion.div
        variants={itemVariants}
        className="p-4 bg-card rounded-2xl flex items-center justify-between"
      >
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Financial Health
          </h3>
          <p className="text-xs text-muted-foreground max-w-[160px]">
            Based on debt, savings rate, spending habits &amp; 50/30/20
          </p>
        </div>
        <HealthScore
          score={healthData.score}
          label={healthData.label}
          color={healthData.color}
        />
      </motion.div>

      {/* 50/30/20 Budget (year) */}
      <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          50/30/20 Budget — {year}
        </h3>
        <BudgetDonut
          needs={needsSpend}
          wants={wantsSpend}
          savings={savingsSpend}
          totalIncome={yearIncome}
        />
      </motion.div>

      {/* Spending by Category (year) */}
      {sortedCategories.length > 0 && (
        <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Spending by Category — {year}
          </h3>
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
