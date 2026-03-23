"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { List, Plus } from "lucide-react";
import AddTransaction from "@/components/AddTransaction";
import TransactionList from "@/components/TransactionList";
import { TransactionType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function Home() {
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [view, setView] = useState<"add" | "list">("add");
  const [month] = useState(new Date().getMonth() + 1);
  const [year] = useState(new Date().getFullYear());

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
