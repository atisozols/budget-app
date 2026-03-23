"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { List, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import AddTransaction from "@/components/AddTransaction";
import TransactionList from "@/components/TransactionList";
import { TransactionType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function Home() {
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [view, setView] = useState<"add" | "list">("add");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const isCurrentMonth =
    month === new Date().getMonth() + 1 && year === new Date().getFullYear();

  const goMonth = (dir: -1 | 1) => {
    setMonth((m) => {
      let newM = m + dir;
      if (newM < 1) {
        setYear((y) => y - 1);
        newM = 12;
      } else if (newM > 12) {
        setYear((y) => y + 1);
        newM = 1;
      }
      return newM;
    });
  };

  const fetchTransactions = useCallback(() => {
    fetch(`/api/transactions?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then(setTransactions)
      .catch(console.error);
  }, [month, year]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-4">
      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => goMonth(-1)}
          className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setMonth(new Date().getMonth() + 1);
            setYear(new Date().getFullYear());
          }}
          className="text-sm font-semibold"
        >
          {MONTH_NAMES[month - 1]} {year}
          {isCurrentMonth && (
            <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
              (now)
            </span>
          )}
        </button>
        <button
          onClick={() => goMonth(1)}
          disabled={isCurrentMonth}
          className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Month summary bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
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
            className={`text-sm font-semibold ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            {formatCurrency(balance)}
          </div>
        </div>
      </motion.div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("add")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
            view === "add"
              ? "bg-primary/20 text-primary"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
        <button
          onClick={() => setView("list")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
            view === "list"
              ? "bg-primary/20 text-primary"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          <List className="w-4 h-4" />
          History ({transactions.length})
        </button>
      </div>

      {/* Content */}
      {view === "add" ? (
        <AddTransaction onSuccess={fetchTransactions} />
      ) : (
        <TransactionList
          transactions={transactions}
          onDelete={(id) =>
            setTransactions((prev) => prev.filter((t) => t._id !== id))
          }
        />
      )}
    </div>
  );
}
