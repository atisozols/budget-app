"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import TransactionList from "@/components/TransactionList";
import { formatCurrency } from "@/lib/utils";
import { useMonth } from "@/lib/MonthContext";
import { useAppData } from "@/lib/AppDataContext";

export default function HistoryPage() {
  const { month, year } = useMonth();
  const { transactions: allTxs, refetchTransactions } = useAppData();

  const transactions = useMemo(
    () =>
      allTxs.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      }),
    [allTxs, month, year],
  );

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          History
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {transactions.length} transactions
        </p>
      </div>

      {/* Month summary */}
      <div className="flex items-center justify-between p-3 bg-card rounded-xl">
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
            className={`text-sm font-semibold ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            {formatCurrency(balance)}
          </div>
        </div>
      </div>

      <TransactionList
        transactions={transactions}
        onDelete={() => refetchTransactions()}
        onUpdate={() => refetchTransactions()}
      />
    </motion.div>
  );
}
