"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Anchor,
} from "lucide-react";
import { formatCurrency, getHealthScore, BUDGET_TYPE_COLORS } from "@/lib/utils";
import { TransactionType, SettingsType } from "@/lib/types";
import HealthScore from "@/components/HealthScore";
import BudgetDonut from "@/components/BudgetDonut";

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [month] = useState(new Date().getMonth() + 1);
  const [year] = useState(new Date().getFullYear());

  useEffect(() => {
    Promise.all([
      fetch(`/api/transactions?month=${month}&year=${year}`).then((r) =>
        r.json()
      ),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([txs, s]) => {
        setTransactions(txs);
        setSettings(s);
      })
      .catch(console.error);
  }, [month, year]);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const brutoIncome = transactions
    .filter((t) => t.type === "income" && t.incomeType === "bruto")
    .reduce((s, t) => s + t.amount, 0);
  const netoIncome = transactions
    .filter((t) => t.type === "income" && t.incomeType === "neto")
    .reduce((s, t) => s + t.amount, 0);

  const needsSpend = transactions
    .filter((t) => t.type === "expense" && t.categoryId?.budgetType === "needs")
    .reduce((s, t) => s + t.amount, 0);
  const wantsSpend = transactions
    .filter((t) => t.type === "expense" && t.categoryId?.budgetType === "wants")
    .reduce((s, t) => s + t.amount, 0);
  const savingsSpend = transactions
    .filter(
      (t) => t.type === "expense" && t.categoryId?.budgetType === "savings"
    )
    .reduce((s, t) => s + t.amount, 0);

  const monthBalance = totalIncome - totalExpense;
  const initialBalance = settings?.initialBalance || 0;
  const taxDebt = settings?.taxDebt || 0;
  const creditDebt = settings?.creditDebt || 0;
  const totalDebt = taxDebt + creditDebt;
  const currentBalance = initialBalance + monthBalance;
  const aboveWater = currentBalance - totalDebt;

  const healthData = getHealthScore({
    balance: currentBalance,
    totalDebt,
    needsRatio: totalExpense > 0 ? (needsSpend / totalExpense) * 100 : 50,
    wantsRatio: totalExpense > 0 ? (wantsSpend / totalExpense) * 100 : 30,
    savingsRatio:
      totalExpense > 0 ? (savingsSpend / totalExpense) * 100 : 20,
    monthlyIncome: totalIncome,
    monthlyExpenses: totalExpense,
  });

  // Income source breakdown
  const incomeByTag: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "income")
    .forEach((t) => {
      if (t.tags?.length) {
        t.tags.forEach((tag) => {
          incomeByTag[tag] = (incomeByTag[tag] || 0) + t.amount;
        });
      } else {
        incomeByTag["Untagged"] = (incomeByTag["Untagged"] || 0) + t.amount;
      }
    });

  // Category spending breakdown
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
    (a, b) => b.amount - a.amount
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
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
      {/* Above Water Indicator */}
      <motion.div
        variants={itemVariants}
        className={`p-4 rounded-2xl border ${
          aboveWater >= 0
            ? "bg-emerald-500/5 border-emerald-500/20"
            : "bg-red-500/5 border-red-500/20"
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          {aboveWater >= 0 ? (
            <Anchor className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400" />
          )}
          <span className="text-sm font-medium text-muted-foreground">
            {aboveWater >= 0 ? "Above Water" : "Below Water"}
          </span>
        </div>
        <div
          className={`text-3xl font-bold ${aboveWater >= 0 ? "text-emerald-400" : "text-red-400"}`}
        >
          {formatCurrency(aboveWater)}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Balance</span>
            <div className="font-medium">{formatCurrency(currentBalance)}</div>
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
            Based on debt ratio, savings, spending habits, and 50/30/20
            adherence
          </p>
        </div>
        <HealthScore
          score={healthData.score}
          label={healthData.label}
          color={healthData.color}
        />
      </motion.div>

      {/* Income/Expense Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-card rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground">Income</span>
          </div>
          <div className="text-lg font-bold text-emerald-400">
            {formatCurrency(totalIncome)}
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bruto</span>
              <span>{formatCurrency(brutoIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Neto</span>
              <span>{formatCurrency(netoIncome)}</span>
            </div>
          </div>
        </div>
        <div className="p-4 bg-card rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-muted-foreground">Expenses</span>
          </div>
          <div className="text-lg font-bold text-red-400">
            {formatCurrency(totalExpense)}
          </div>
          <div className="mt-2 space-y-1 text-xs">
            {sortedCategories.slice(0, 3).map((cat) => (
              <div key={cat.name} className="flex justify-between">
                <span className="text-muted-foreground truncate">
                  {cat.emoji} {cat.name}
                </span>
                <span>{formatCurrency(cat.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 50/30/20 Budget */}
      <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          50/30/20 Budget
        </h3>
        <BudgetDonut
          needs={needsSpend}
          wants={wantsSpend}
          savings={savingsSpend}
          totalIncome={totalIncome}
        />
      </motion.div>

      {/* Income Sources */}
      {Object.keys(incomeByTag).length > 0 && (
        <motion.div
          variants={itemVariants}
          className="p-4 bg-card rounded-2xl"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Income Sources
          </h3>
          <div className="space-y-2">
            {Object.entries(incomeByTag)
              .sort((a, b) => b[1] - a[1])
              .map(([tag, amount], i) => {
                const pct =
                  totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
                const colors = [
                  "#6366f1",
                  "#22c55e",
                  "#f59e0b",
                  "#ec4899",
                  "#3b82f6",
                ];
                const color = colors[i % colors.length];
                return (
                  <div key={tag}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{tag}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(amount)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </motion.div>
      )}

      {/* Spending by Category */}
      {sortedCategories.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="p-4 bg-card rounded-2xl"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Spending by Category
          </h3>
          <div className="space-y-2">
            {sortedCategories.map((cat) => {
              const pct =
                totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
              return (
                <div
                  key={cat.name}
                  className="flex items-center gap-3 text-sm"
                >
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
