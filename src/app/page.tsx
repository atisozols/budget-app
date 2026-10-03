"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Anchor, AlertTriangle, Target, Wallet } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppData } from "@/lib/AppDataContext";
import {
  useCreditDebt,
  useSpendable,
  useTaxYear,
} from "@/lib/useFinance";
import { normalizeHomeCards, type HomeCardId } from "@/lib/homeCards";
import {
  computeCategoryTrends,
  computeMonthForecast,
  computeHealthScore,
} from "@/lib/insights";
import { buildSpendWidgetDailySeries } from "@/lib/spendInsights";
import { budgetProgress } from "@/lib/budgets";
import { balanceSeries, currentBalance } from "@/lib/balance";
import { categoryLabel } from "@/lib/categories";
import { logicalToday } from "@/lib/dates";
import SpendableCard from "@/components/SpendableCard";
import DailySpendCard from "@/components/DailySpendCard";
import ActivityGrid from "@/components/ActivityGrid";
import CategoryTrendsCard from "@/components/CategoryTrendsCard";
import MonthForecastCard from "@/components/MonthForecastCard";
import HealthScoreCard from "@/components/HealthScoreCard";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function BudgetsSummary() {
  const { settings, allTransactions, categoryIndex } = useAppData();
  const progress = useMemo(
    () =>
      budgetProgress(settings?.budgets ?? [], allTransactions, categoryIndex)
        .sort((a, b) => b.spent / b.budget - a.spent / a.budget)
        .slice(0, 4),
    [settings, allTransactions, categoryIndex],
  );
  const today = logicalToday();
  const monthProgress =
    today.getDate() /
    new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  if (progress.length === 0) {
    return (
      <Link
        href="/plan"
        className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4"
      >
        <Target className="h-5 w-5 shrink-0 text-primary" />
        <div>
          <div className="text-sm font-medium">Set budgets for a few categories</div>
          <div className="text-xs text-muted-foreground">
            Plan → Budgets shows what you usually spend in each one
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/plan" className="block rounded-2xl bg-card p-4">
      <div className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        Budgets this month
      </div>
      <div className="space-y-2.5">
        {progress.map((p) => {
          const category = categoryIndex.byId.get(p.categoryId);
          if (!category) return null;
          return (
            <div key={p.categoryId}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate">
                  {category.emoji} {categoryLabel(category, categoryIndex)}
                </span>
                <span className="shrink-0 tabular-nums">
                  <span
                    className={cn(
                      p.status === "over"
                        ? "text-red-400"
                        : p.status === "watch"
                          ? "text-amber-400"
                          : "text-foreground",
                    )}
                  >
                    {formatCurrency(p.spent)}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    / {formatCurrency(p.budget)}
                  </span>
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full",
                    p.status === "over"
                      ? "bg-red-500"
                      : p.status === "watch"
                        ? "bg-amber-500"
                        : "bg-emerald-500",
                  )}
                  style={{ width: `${Math.min((p.spent / p.budget) * 100, 100)}%` }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-foreground/60"
                  style={{ left: `${monthProgress * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Link>
  );
}

export default function Home() {
  const {
    allTransactions,
    transactions,
    settings,
    recurring,
    categoryIndex,
    year,
  } = useAppData();
  const spendable = useSpendable();
  const tax = useTaxYear(year);
  const credit = useCreditDebt();

  const balance = useMemo(
    () => currentBalance(allTransactions, settings),
    [allTransactions, settings],
  );
  const taxToPay = Math.max(0, tax.outstanding);
  const totalDebt = taxToPay + credit.outstanding;
  const aboveWater = balance - totalDebt;

  const series = useMemo(
    () => buildSpendWidgetDailySeries(transactions, year),
    [transactions, year],
  );
  const balanceLine = useMemo(
    () => balanceSeries(allTransactions, settings, year),
    [allTransactions, settings, year],
  );
  const trends = useMemo(
    () => computeCategoryTrends(allTransactions, categoryIndex),
    [allTransactions, categoryIndex],
  );
  const forecast = useMemo(
    () => computeMonthForecast(allTransactions, recurring, categoryIndex),
    [allTransactions, recurring, categoryIndex],
  );
  const health = useMemo(
    () =>
      computeHealthScore({
        transactions: allTransactions,
        dailySeries: series,
        totalDebt,
        yearTaxOwed: tax.owed,
        index: categoryIndex,
      }),
    [allTransactions, series, totalDebt, tax.owed, categoryIndex],
  );

  const cards = normalizeHomeCards(settings?.homeCards);

  const renderCard = (cardId: HomeCardId) => {
    switch (cardId) {
      case "spendable":
        return <SpendableCard result={spendable} />;

      case "budgets":
        return <BudgetsSummary />;

      case "balance-overview":
        return (
          <div
            className={cn(
              "rounded-2xl border p-4",
              aboveWater >= 0
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-red-500/20 bg-red-500/5",
            )}
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Balance</span>
              </div>
              <div className="flex items-center gap-1.5">
                {aboveWater >= 0 ? (
                  <Anchor className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                )}
                <span className="text-xs text-muted-foreground">
                  {aboveWater >= 0 ? "Above water" : "Below water"}
                </span>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold tabular-nums">
                {formatCurrency(balance)}
              </div>
              <div
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  aboveWater >= 0 ? "text-emerald-400" : "text-red-400",
                )}
              >
                {formatCurrency(aboveWater)}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Calibrated</span>
                <div className="font-medium tabular-nums">
                  {formatCurrency(settings?.currentBalance ?? 0)}
                </div>
                {settings?.balanceDate ? (
                  <div className="text-[9px] text-muted-foreground/60">
                    {format(new Date(settings.balanceDate), "MMM d")}
                  </div>
                ) : null}
              </div>
              <Link href="/insights">
                <span className="text-muted-foreground">Tax to pay</span>
                <div className="font-medium text-orange-400 tabular-nums">
                  {formatCurrency(taxToPay)}
                </div>
                <div className="text-[9px] text-muted-foreground/60">
                  {year} · {formatCurrency(tax.paid)} paid
                </div>
              </Link>
              <div>
                <span className="text-muted-foreground">Credit debt</span>
                <div className="font-medium text-red-400 tabular-nums">
                  {formatCurrency(credit.outstanding)}
                </div>
                {credit.repaid > 0 ? (
                  <div className="text-[9px] text-muted-foreground/60">
                    {formatCurrency(credit.repaid)} repaid
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );

      case "daily-spend":
        return (
          <DailySpendCard
            transactions={allTransactions}
            allowance={spendable.hasGoal ? spendable.allowanceToday : null}
          />
        );

      case "month-forecast":
        return <MonthForecastCard forecast={forecast} />;

      case "category-trends":
        return trends.length > 0 ? <CategoryTrendsCard trends={trends} /> : null;

      case "balance-chart":
        if (balanceLine.length <= 1) return null;
        return (
          <div className="rounded-2xl bg-card p-4">
            <div className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              Balance — {year}
            </div>
            <div className="pointer-events-none -mx-2 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={balanceLine}>
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
          </div>
        );

      case "activity-grid":
        return <ActivityGrid transactions={transactions} year={year} />;

      case "health-score":
        return <HealthScoreCard health={health} />;
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.06 } },
      }}
      className="space-y-4"
    >
      {cards.map((card) => {
        if (!card.enabled) return null;
        const content = renderCard(card.id);
        if (!content) return null;
        return (
          <motion.div key={card.id} variants={itemVariants}>
            {content}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
