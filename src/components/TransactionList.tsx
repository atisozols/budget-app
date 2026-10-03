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
  Repeat,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { IncomeType, TransactionType } from "@/lib/types";
import { format } from "date-fns";
import AmountInput from "@/components/AmountInput";
import CategoryPicker from "@/components/CategoryPicker";
import { useAppData } from "@/lib/AppDataContext";
import { categoryLabel, resolveCategory } from "@/lib/categories";
import { dateKeyToDate, txDateKey } from "@/lib/dates";
import { taxYearOf } from "@/lib/tax";

interface TransactionListProps {
  transactions: TransactionType[];
  /** Open every day group (used while searching/filtering). */
  expandAll?: boolean;
  emptyLabel?: string;
}

function openNativeDatePicker(value: string, onPick: (value: string) => void) {
  const input = document.createElement("input");
  input.type = "date";
  input.value = value;
  input.style.cssText = "position:fixed;opacity:0;top:50%;left:50%";
  document.body.appendChild(input);
  const cleanup = () => {
    try {
      input.remove();
    } catch {
      /* already removed */
    }
  };
  input.addEventListener("change", (e) => {
    onPick((e.target as HTMLInputElement).value);
    cleanup();
  });
  input.addEventListener("blur", cleanup);
  input.showPicker?.();
  input.focus();
}

function EditPanel({
  tx,
  onDone,
}: {
  tx: TransactionType;
  onDone: () => void;
}) {
  const { categoryIndex, refetchTransactions, deleteTransaction } =
    useAppData();
  const [amount, setAmount] = useState(tx.amount.toString());
  const [date, setDate] = useState(txDateKey(tx.date));
  const [description, setDescription] = useState(tx.description ?? "");
  const [categoryId, setCategoryId] = useState(tx.categoryId?._id ?? "");
  const [isWriteOff, setIsWriteOff] = useState(tx.isWriteOff);
  const [incomeType, setIncomeType] = useState<IncomeType>(
    tx.incomeType ?? "neto",
  );
  const [taxYear, setTaxYear] = useState(taxYearOf(tx));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = categoryIndex.byId.get(categoryId);
  const isTax = Boolean(category?.isTax);
  const dateYear = Number(date.slice(0, 4));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        amount: parseFloat(amount),
        date,
        description,
        categoryId,
      };
      if (tx.type === "expense") body.isWriteOff = isTax ? false : isWriteOff;
      if (tx.type === "income") body.incomeType = incomeType;
      body.taxYear = isTax && taxYear !== dateYear ? taxYear : null;

      const res = await fetch(`/api/transactions/${tx._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Couldn't save");
        return;
      }
      await refetchTransactions();
      onDone();
    } catch (e) {
      console.error("Failed to update:", e);
      setError("Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const rowLabel = "w-16 shrink-0 text-xs text-muted-foreground";

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      className="mt-3 space-y-2.5 border-t border-border/50 pt-3"
    >
      <div className="flex items-center gap-2">
        <span className={rowLabel}>Amount</span>
        <div className="flex flex-1 items-center gap-1">
          <span className="text-sm text-muted-foreground">€</span>
          <AmountInput
            value={amount}
            onChange={setAmount}
            className="flex-1 rounded-lg bg-secondary p-1.5 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={rowLabel}>Note</span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="min-w-0 flex-1 rounded-lg bg-secondary p-1.5 text-sm outline-none placeholder:text-muted-foreground/40"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className={rowLabel}>Date</span>
        <button
          type="button"
          onClick={() => openNativeDatePicker(date, setDate)}
          className="flex flex-1 items-center gap-2 rounded-lg bg-secondary p-1.5 text-left text-sm"
        >
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {format(dateKeyToDate(date), "MMM d, yyyy")}
        </button>
      </div>

      <div className="space-y-1.5">
        <span className={rowLabel}>Category</span>
        <CategoryPicker
          type={tx.type}
          value={categoryId}
          onChange={setCategoryId}
        />
      </div>

      {tx.type === "expense" && isTax ? (
        <div className="flex items-center gap-2">
          <span className={rowLabel}>Tax year</span>
          <div className="flex flex-1 gap-1.5">
            {[dateYear, dateYear - 1].map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setTaxYear(year)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-medium transition-all",
                  taxYear === year
                    ? "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {tx.type === "expense" && !isTax ? (
        <div className="flex items-center gap-2">
          <span className={rowLabel}>Write-off</span>
          <button
            type="button"
            onClick={() => setIsWriteOff(!isWriteOff)}
            className={cn(
              "flex flex-1 items-center gap-2 rounded-lg p-1.5 transition-all",
              isWriteOff
                ? "bg-amber-500/10 ring-1 ring-amber-500/30"
                : "bg-secondary",
            )}
          >
            <div
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded border-2 transition-all",
                isWriteOff
                  ? "border-amber-500 bg-amber-500"
                  : "border-muted-foreground",
              )}
            >
              {isWriteOff && <Check className="h-2.5 w-2.5 text-white" />}
            </div>
            <span className="text-xs">
              {isWriteOff ? "Deductible" : "Not deductible"}
            </span>
          </button>
        </div>
      ) : null}

      {tx.type === "income" ? (
        <div className="flex items-center gap-2">
          <span className={rowLabel}>Income</span>
          <div className="flex flex-1 gap-1.5">
            {(["bruto", "neto"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setIncomeType(value)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-all",
                  incomeType === value
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <div className="text-xs text-red-400">{error}</div> : null}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving || !amount || !categoryId}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/20 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            deleteTransaction(tx);
            onDone();
          }}
          aria-label="Delete"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-destructive/10 px-4 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export default function TransactionList({
  transactions,
  expandAll = false,
  emptyLabel = "No transactions yet",
}: TransactionListProps) {
  const { categoryIndex, deleteTransaction } = useAppData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  // Group by calendar day, keeping the incoming (newest-first) order.
  const grouped = new Map<string, TransactionType[]>();
  for (const tx of transactions) {
    const key = txDateKey(tx.date);
    const list = grouped.get(key) ?? [];
    list.push(tx);
    grouped.set(key, list);
  }

  return (
    <div className="space-y-2">
      {[...grouped.entries()].map(([dateKey, txs]) => {
        const isOpen = expandAll || openDay === dateKey;
        const day = dateKeyToDate(dateKey);
        const dayTotal = txs.reduce(
          (sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount),
          0,
        );
        const catEmojis = [
          ...new Set(txs.map((t) => t.categoryId?.emoji || "📦")),
        ].slice(0, 5);

        return (
          <div key={dateKey} className="overflow-hidden rounded-2xl bg-card">
            <button
              type="button"
              onClick={() => setOpenDay(openDay === dateKey ? null : dateKey)}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <div className="w-10 shrink-0 text-center">
                <div className="text-lg font-bold leading-none">
                  {format(day, "d")}
                </div>
                <div className="text-[10px] uppercase text-muted-foreground">
                  {format(day, "EEE")}
                </div>
              </div>

              <div className="flex shrink-0 -space-x-1">
                {catEmojis.map((emoji, idx) => (
                  <span
                    key={idx}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs ring-1 ring-background"
                  >
                    {emoji}
                  </span>
                ))}
              </div>

              <div className="flex-1" />

              <div className="shrink-0 text-right">
                <div
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    dayTotal >= 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {formatCurrency(Math.abs(dayTotal))}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {txs.length} item{txs.length !== 1 ? "s" : ""}
                </div>
              </div>

              {!expandAll ? (
                <svg
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
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
              ) : null}
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 px-3 pb-3">
                    {txs.map((tx) => {
                      const isEditing = editingId === tx._id;
                      const category = resolveCategory(
                        tx.categoryId,
                        categoryIndex,
                      );
                      return (
                        <div
                          key={tx._id}
                          className={cn(
                            "rounded-xl p-3 transition-all",
                            isEditing
                              ? "bg-primary/5 ring-1 ring-primary/20"
                              : "group bg-secondary/50",
                          )}
                        >
                          <div
                            className="flex cursor-pointer items-center gap-3"
                            onClick={() =>
                              setEditingId(isEditing ? null : tx._id)
                            }
                          >
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                              style={{
                                backgroundColor:
                                  (category?.color || "#6366f1") + "20",
                              }}
                            >
                              {category?.emoji || "📦"}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-medium">
                                  {tx.description || category?.name || "Unknown"}
                                </span>
                                {tx.isWriteOff && (
                                  <FileText className="h-3 w-3 shrink-0 text-amber-500" />
                                )}
                                {tx.recurringPaymentId && (
                                  <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" />
                                )}
                                {tx.type === "income" && tx.incomeType && (
                                  <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                    {tx.incomeType}
                                  </span>
                                )}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {categoryLabel(category, categoryIndex)}
                                {tx.tags?.length > 0 && ` · ${tx.tags.join(", ")}`}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "flex items-center gap-1 text-sm font-semibold tabular-nums",
                                  tx.type === "income"
                                    ? "text-emerald-400"
                                    : "text-red-400",
                                )}
                              >
                                {tx.type === "income" ? (
                                  <ArrowUpCircle className="h-3 w-3" />
                                ) : (
                                  <ArrowDownCircle className="h-3 w-3" />
                                )}
                                {tx.type === "income" ? "+" : "-"}
                                {formatCurrency(tx.amount)}
                              </span>
                              {!isEditing && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTransaction(tx);
                                  }}
                                  aria-label="Delete"
                                  className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {isEditing && (
                            <EditPanel
                              tx={tx}
                              onDone={() => setEditingId(null)}
                            />
                          )}
                        </div>
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
