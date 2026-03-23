"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, FileText, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { TransactionType } from "@/lib/types";
import { format } from "date-fns";

interface TransactionListProps {
  transactions: TransactionType[];
  onDelete?: (id: string) => void;
}

export default function TransactionList({
  transactions,
  onDelete,
}: TransactionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete?.(id);
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeletingId(null);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No transactions yet
      </div>
    );
  }

  // Group by date
  const grouped = transactions.reduce(
    (acc, tx) => {
      const dateKey = format(new Date(tx.date), "yyyy-MM-dd");
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(tx);
      return acc;
    },
    {} as Record<string, TransactionType[]>
  );

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([dateKey, txs]) => (
        <div key={dateKey}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {format(new Date(dateKey), "EEEE, MMM d")}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatCurrency(
                txs.reduce(
                  (sum, tx) =>
                    sum + (tx.type === "income" ? tx.amount : -tx.amount),
                  0
                )
              )}
            </span>
          </div>
          <div className="space-y-1.5">
            <AnimatePresence>
              {txs.map((tx, i) => (
                <motion.div
                  key={tx._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl group"
                >
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                    style={{
                      backgroundColor:
                        (tx.categoryId?.color || "#6366f1") + "20",
                    }}
                  >
                    {tx.categoryId?.emoji || "📦"}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">
                        {tx.description || tx.categoryId?.name || "Unknown"}
                      </span>
                      {tx.isWriteOff && (
                        <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                      )}
                      {tx.type === "income" && tx.incomeType && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                          {tx.incomeType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{tx.categoryId?.name}</span>
                      {tx.tags?.length > 0 && (
                        <span>· {tx.tags.join(", ")}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        tx.type === "income"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {tx.type === "income" ? (
                        <span className="flex items-center gap-1">
                          <ArrowUpCircle className="w-3 h-3" />+
                          {formatCurrency(tx.amount)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <ArrowDownCircle className="w-3 h-3" />-
                          {formatCurrency(tx.amount)}
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => handleDelete(tx._id)}
                      disabled={deletingId === tx._id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}
