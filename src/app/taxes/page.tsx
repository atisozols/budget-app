"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calculator,
  TrendingDown,
  CreditCard,
} from "lucide-react";
import { formatCurrency, calculateSelfEmployedTaxes } from "@/lib/utils";
import { useAppData } from "@/lib/AppDataContext";

export default function TaxesPage() {
  const { transactions: contextTxs, settings, year: contextYear } = useAppData();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(contextYear);
  const [yearTransactions, setYearTransactions] = useState(contextTxs);
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const m = new Date().getMonth();
    if (m < 3) return 1;
    if (m < 6) return 2;
    if (m < 9) return 3;
    return 4;
  });

  // Fetch transactions for selected year when it differs from the context year
  useEffect(() => {
    if (selectedYear === contextYear) {
      setYearTransactions(contextTxs);
      return;
    }
    fetch(`/api/transactions?year=${selectedYear}`)
      .then((r) => r.json())
      .then(setYearTransactions)
      .catch((e) => console.error("Failed to fetch tax year transactions:", e));
  }, [selectedYear, contextYear, contextTxs]);

  const allTxs = yearTransactions;
  const year = selectedYear;

  function getQuarterMonths(q: number): number[] {
    const start = (q - 1) * 3 + 1;
    return [start, start + 1, start + 2];
  }

  // Filter transactions for the selected quarter
  const transactions = useMemo(() => {
    const months = getQuarterMonths(selectedQuarter);
    return allTxs.filter((t) => {
      const d = new Date(t.date);
      const m = d.getMonth() + 1;
      return d.getFullYear() === year && months.includes(m);
    });
  }, [allTxs, selectedQuarter, year]);

  const brutoIncome = transactions
    .filter((t) => t.type === "income" && t.incomeType === "bruto")
    .reduce((s, t) => s + t.amount, 0);

  const writeOffExpenses = transactions
    .filter((t) => t.type === "expense" && t.isWriteOff)
    .reduce((s, t) => s + t.amount, 0);

  const iinRate = settings?.iinRate || 25.5;
  const vsaoiRate = settings?.vsaoiRate || 31.07;

  // Latvian tax cycle info: annual tax declaration due March 1
  // Tax year = previous calendar year. Debt from previous year finalizes March 1.
  const now = new Date();
  const currentTaxYear = now.getMonth() < 2 ? year - 2 : year - 1; // Before March → 2 years ago
  const nextDeadline = new Date(year, 2, 1); // March 1 of current year
  const isBeforeDeadline = now < nextDeadline;
  const daysToDeadline = isBeforeDeadline
    ? Math.ceil(
        (nextDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  const taxCalc = calculateSelfEmployedTaxes(
    brutoIncome,
    writeOffExpenses,
    iinRate,
    vsaoiRate,
  );

  const writeOffItems = transactions.filter(
    (t) => t.type === "expense" && t.isWriteOff,
  );

  const brutoItems = transactions.filter(
    (t) => t.type === "income" && t.incomeType === "bruto",
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
      <div>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Tax Calculator
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Self-employed (bruto) income tax breakdown
        </p>
      </div>

      {/* Year Selector */}
      <div className="flex gap-2 items-center">
        {[currentYear - 1, currentYear].map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
              selectedYear === y
                ? "bg-primary/20 text-primary ring-1 ring-primary/50"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {y}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-1">Tax Year</span>
      </div>

      {/* Quarter Selector */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((q) => (
          <button
            key={q}
            onClick={() => setSelectedQuarter(q)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedQuarter === q
                ? "bg-primary/20 text-primary ring-1 ring-primary/50"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            Q{q}
          </button>
        ))}
      </div>

      {/* Latvian Tax Cycle */}
      {isBeforeDeadline && (
        <motion.div
          variants={itemVariants}
          className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-3"
        >
          <CreditCard className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div className="text-sm font-medium text-amber-400">
              Tax year {currentTaxYear} — declaration due March 1
            </div>
            <div className="text-xs text-muted-foreground">
              {daysToDeadline} days remaining
            </div>
          </div>
        </motion.div>
      )}

      {/* Tax Breakdown */}
      <motion.div
        variants={itemVariants}
        className="p-4 bg-card rounded-2xl space-y-3"
      >
        <h3 className="text-sm font-medium text-muted-foreground">
          Q{selectedQuarter} {year} — Tax Breakdown
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Bruto Income</span>
            <span className="font-medium text-emerald-400">
              {formatCurrency(taxCalc.brutoIncome)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Write-off Expenses ({writeOffItems.length} items)
            </span>
            <span className="font-medium text-amber-400">
              -{formatCurrency(taxCalc.writeOffExpenses)}
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between text-sm font-semibold">
            <span>Profit</span>
            <span>{formatCurrency(taxCalc.profit)}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VSAOI ({vsaoiRate}%)</span>
            <span className="text-red-400">
              -{formatCurrency(taxCalc.vsaoi)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxable Income</span>
            <span>{formatCurrency(taxCalc.taxableIncome)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IIN ({iinRate}%)</span>
            <span className="text-red-400">
              -{formatCurrency(taxCalc.iinTax)}
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between text-sm font-semibold">
            <span>Total Tax</span>
            <span className="text-red-400">
              {formatCurrency(taxCalc.totalTax)}
            </span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Net Income</span>
            <span
              className={
                taxCalc.netIncome >= 0 ? "text-emerald-400" : "text-red-400"
              }
            >
              {formatCurrency(taxCalc.netIncome)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Tax Obligations Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-card rounded-xl">
          <div className="text-xs text-muted-foreground">VSAOI Due</div>
          <div className="text-lg font-bold text-red-400">
            {formatCurrency(taxCalc.vsaoi)}
          </div>
          <div className="text-[10px] text-muted-foreground">Quarterly</div>
        </div>
        <div className="p-3 bg-card rounded-xl">
          <div className="text-xs text-muted-foreground">IIN Due</div>
          <div className="text-lg font-bold text-red-400">
            {formatCurrency(taxCalc.iinTax)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            On profit after VSAOI
          </div>
        </div>
      </motion.div>

      {/* Total owed including debt */}
      <motion.div
        variants={itemVariants}
        className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl"
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-muted-foreground">
            Total Tax Obligations (Q{selectedQuarter})
          </span>
        </div>
        <div className="text-2xl font-bold text-red-400">
          {formatCurrency(taxCalc.totalTax)}
        </div>
        <div className="mt-2 text-xs text-muted-foreground/70">
          Approximate — set your real tax debt in Settings.
        </div>
      </motion.div>

      {/* Bruto Income Items */}
      {brutoItems.length > 0 && (
        <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Bruto Income Items
          </h3>
          <div className="space-y-1.5">
            {brutoItems.map((tx) => (
              <div
                key={tx._id}
                className="flex justify-between text-sm p-2 bg-secondary/50 rounded-lg"
              >
                <span className="truncate">
                  {tx.description || tx.categoryId?.name}
                </span>
                <span className="text-emerald-400 shrink-0 ml-2">
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Write-off Items */}
      {writeOffItems.length > 0 && (
        <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Write-off Expenses
          </h3>
          <div className="space-y-1.5">
            {writeOffItems.map((tx) => (
              <div
                key={tx._id}
                className="flex justify-between text-sm p-2 bg-secondary/50 rounded-lg"
              >
                <span className="truncate">
                  {tx.description || tx.categoryId?.name}
                </span>
                <span className="text-amber-400 shrink-0 ml-2">
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
