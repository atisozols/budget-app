"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
  Check,
  X,
  Calendar,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { TransactionType } from "@/lib/types";
import { format } from "date-fns";
import AmountInput from "@/components/AmountInput";

interface TransactionListProps {
  transactions: TransactionType[];
  onDelete?: (id: string) => void;
  onUpdate?: (updated: TransactionType) => void;
}

export default function TransactionList({
  transactions,
  onDelete,
  onUpdate,
}: TransactionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editWriteOff, setEditWriteOff] = useState(false);
  const [saving, setSaving] = useState(false);

  const startEdit = (tx: TransactionType) => {
    setEditingId(tx._id);
    setEditAmount(tx.amount.toString());
    setEditDate(format(new Date(tx.date), "yyyy-MM-dd"));
    setEditWriteOff(tx.isWriteOff);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(editAmount),
          date: new Date(editDate),
          isWriteOff: editWriteOff,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate?.(updated);
        setEditingId(null);
      }
    } catch (error) {
      console.error("Failed to update:", error);
    } finally {
      setSaving(false);
    }
  };

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

  const [openDay, setOpenDay] = useState<string | null>(null);

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
    {} as Record<string, TransactionType[]>,
  );

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([dateKey, txs]) => {
        const isOpen = openDay === dateKey;
        const dayTotal = txs.reduce(
          (sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount),
          0,
        );
        const expenseTotal = txs
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0);
        // Unique category emojis for preview
        const catEmojis = [
          ...new Set(txs.map((t) => t.categoryId?.emoji || "📦")),
        ].slice(0, 5);

        return (
          <div key={dateKey} className="bg-card rounded-2xl overflow-hidden">
            {/* Day header — always visible */}
            <button
              onClick={() => setOpenDay(isOpen ? null : dateKey)}
              className="w-full flex items-center gap-3 p-3 text-left"
            >
              {/* Date column */}
              <div className="shrink-0 w-10 text-center">
                <div className="text-lg font-bold leading-none">
                  {format(new Date(dateKey), "d")}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">
                  {format(new Date(dateKey), "EEE")}
                </div>
              </div>

              {/* Category emoji preview */}
              <div className="flex -space-x-1 shrink-0">
                {catEmojis.map((emoji, idx) => (
                  <span
                    key={idx}
                    className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs ring-1 ring-background"
                  >
                    {emoji}
                  </span>
                ))}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Amount */}
              <div className="text-right shrink-0">
                <div
                  className={cn(
                    "text-sm font-semibold",
                    dayTotal >= 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {formatCurrency(Math.abs(dayTotal))}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {txs.length} item{txs.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Chevron */}
              <svg
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                  isOpen && "rotate-180",
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Expanded transaction list */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 space-y-1.5">
                    {txs.map((tx, i) => {
                      const isEditing = editingId === tx._id;
                      return (
                        <motion.div
                          key={tx._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20, height: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={cn(
                            "p-3 rounded-xl transition-all",
                            isEditing
                              ? "bg-primary/5 ring-1 ring-primary/20"
                              : "bg-secondary/50 group",
                          )}
                        >
                          <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => !isEditing && startEdit(tx)}
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
                                  {tx.description ||
                                    tx.categoryId?.name ||
                                    "Unknown"}
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
                              {!isEditing && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(tx._id);
                                  }}
                                  disabled={deletingId === tx._id}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Inline edit panel */}
                          {isEditing && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              className="mt-3 pt-3 border-t border-border/50 space-y-2.5"
                            >
                              {/* Amount */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-14">
                                  Amount
                                </span>
                                <div className="flex items-center gap-1 flex-1">
                                  <span className="text-sm text-muted-foreground">
                                    €
                                  </span>
                                  <AmountInput
                                    value={editAmount}
                                    onChange={setEditAmount}
                                    className="flex-1 p-1.5 bg-secondary rounded-lg text-sm"
                                    autoFocus
                                  />
                                </div>
                              </div>

                              {/* Date */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-14">
                                  Date
                                </span>
                                <button
                                  onClick={() => {
                                    const input =
                                      document.createElement("input");
                                    input.type = "date";
                                    input.value = editDate;
                                    input.style.position = "fixed";
                                    input.style.opacity = "0";
                                    input.style.top = "50%";
                                    input.style.left = "50%";
                                    document.body.appendChild(input);
                                    const cleanup = () => {
                                      try {
                                        input.remove();
                                      } catch {
                                        /* already removed */
                                      }
                                    };
                                    input.addEventListener("change", (e) => {
                                      setEditDate(
                                        (e.target as HTMLInputElement).value,
                                      );
                                      cleanup();
                                    });
                                    input.addEventListener("blur", cleanup);
                                    input.showPicker?.();
                                    input.focus();
                                  }}
                                  className="flex-1 flex items-center gap-2 p-1.5 bg-secondary rounded-lg text-sm text-left"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                  {format(new Date(editDate), "MMM d, yyyy")}
                                </button>
                              </div>

                              {/* Write-off toggle */}
                              {tx.type === "expense" && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-14">
                                    Write-off
                                  </span>
                                  <button
                                    onClick={() =>
                                      setEditWriteOff(!editWriteOff)
                                    }
                                    className={cn(
                                      "flex items-center gap-2 p-1.5 rounded-lg transition-all flex-1",
                                      editWriteOff
                                        ? "bg-amber-500/10 ring-1 ring-amber-500/30"
                                        : "bg-secondary",
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                                        editWriteOff
                                          ? "bg-amber-500 border-amber-500"
                                          : "border-muted-foreground",
                                      )}
                                    >
                                      {editWriteOff && (
                                        <Check className="w-2.5 h-2.5 text-white" />
                                      )}
                                    </div>
                                    <span className="text-xs">
                                      {editWriteOff
                                        ? "Deductible"
                                        : "Not deductible"}
                                    </span>
                                  </button>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => saveEdit(tx._id)}
                                  disabled={saving || !editAmount}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary/20 text-primary rounded-lg text-xs font-medium disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  {saving ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-secondary text-muted-foreground rounded-lg text-xs font-medium hover:text-foreground transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Cancel
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(tx._id);
                                    setEditingId(null);
                                  }}
                                  disabled={deletingId === tx._id}
                                  className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
