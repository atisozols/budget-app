"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  ArrowDown,
  ArrowUp,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  Trash2,
  X,
} from "lucide-react";
import AddTransaction from "@/components/AddTransaction";
import { TransactionType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useMonth } from "@/lib/MonthContext";
import { format } from "date-fns";

const NUM_BARS = 14;

export default function Home() {
  const { month, year } = useMonth();
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);

  const fetchTransactions = useCallback(() => {
    fetch(`/api/transactions?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then(setTransactions)
      .catch(console.error);
  }, [month, year]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ─── Helper: local YYYY-MM-DD key (avoids UTC shift) ────────────
  const localDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // ─── Daily spend data (last NUM_BARS days ending today) ──────────
  const dailyBars = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const bars: {
      date: Date;
      spend: number;
      segments: { amount: number }[];
      txs: TransactionType[];
      isToday: boolean;
      dayLabel: string;
    }[] = [];

    for (let i = NUM_BARS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = localDateKey(d);
      const dayTxs = transactions.filter((t) => {
        const txD = new Date(t.date);
        return (
          localDateKey(txD) === key &&
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

  // ─── Rolling 7-day comparison ───────────────────────────────────
  const { last7Spend, prev7Spend, pctChange7 } = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const start7 = new Date(now);
    start7.setDate(start7.getDate() - 6);
    start7.setHours(0, 0, 0, 0);

    const end14 = new Date(start7);
    end14.setMilliseconds(-1); // end of day before start7
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

  // ─── Declining spend streak ──────────────────────────────────────
  const decliningStreak = useMemo(() => {
    let streak = 0;
    // Start from yesterday going backward (skip today since it's incomplete)
    for (let i = dailyBars.length - 2; i >= 1; i--) {
      if (
        dailyBars[i].spend > 0 &&
        dailyBars[i].spend < dailyBars[i - 1].spend
      ) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [dailyBars]);

  // ─── Month summary ──────────────────────────────────────────────
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

      {/* Non-recurring Spend Bars Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 bg-card rounded-2xl"
      >
        {/* Header */}
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
            {decliningStreak >= 2 && (
              <div className="flex items-center gap-1 text-xs text-amber-400 mt-0.5 justify-end">
                <Flame className="w-3 h-3" />
                {decliningStreak} day streak
              </div>
            )}
          </div>
        </div>

        {/* Bars */}
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
                {/* Amount label */}
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

      {/* Add Transaction */}
      <AddTransaction onSuccess={fetchTransactions} />
    </div>
  );
}
