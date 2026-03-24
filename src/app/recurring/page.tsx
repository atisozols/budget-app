"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Repeat, Check, Calendar, FileText } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { TransactionType, RecurringPaymentType, BudgetType } from "@/lib/types";
import AmountInput from "@/components/AmountInput";
import { useMonth } from "@/lib/MonthContext";
import { useAppData } from "@/lib/AppDataContext";

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

export default function RecurringPage() {
  const { month, year, isCurrentMonth } = useMonth();
  const {
    recurring: payments,
    categories,
    transactions: allTxs,
    refetchRecurring,
    refetchTransactions,
  } = useAppData();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [budgetType, setBudgetType] = useState<BudgetType>("needs");
  const [isWriteOff, setIsWriteOff] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const monthTransactions = useMemo(
    () =>
      allTxs.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      }),
    [allTxs, month, year],
  );

  const expenseCategories = categories.filter((c) => c.type === "expense");

  // Map: recurringPaymentId -> transaction (paid this month)
  const paidMap = new Map<string, TransactionType>();
  monthTransactions.forEach((t) => {
    if (t.recurringPaymentId) {
      paidMap.set(t.recurringPaymentId, t);
    }
  });

  const activePayments = payments.filter((p) => p.isActive);
  const paidTotal = activePayments
    .filter((p) => paidMap.has(p._id))
    .reduce((s, p) => s + p.amount, 0);
  const unpaidTotal = activePayments
    .filter((p) => !paidMap.has(p._id))
    .reduce((s, p) => s + p.amount, 0);
  const totalMonthly = activePayments.reduce((s, p) => s + p.amount, 0);

  const handleAdd = async () => {
    if (!name || !amount || !categoryId) return;
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          amount: parseFloat(amount),
          categoryId,
          frequency: "monthly",
          dueDay: 1,
          budgetType,
          isWriteOff,
          isActive: true,
        }),
      });
      if (res.ok) {
        await refetchRecurring();
        setName("");
        setAmount("");
        setCategoryId("");
        setIsWriteOff(false);
        setShowForm(false);
      }
    } catch (error) {
      console.error("Failed to add recurring payment:", error);
    }
  };

  const startEditing = (payment: RecurringPaymentType) => {
    setEditing(payment._id);
    setEditAmount(payment.amount.toString());
  };

  const handlePay = async (paymentId: string, dateStr: string) => {
    setPaying(paymentId);
    try {
      const res = await fetch(`/api/recurring/${paymentId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          amount: parseFloat(editAmount) || undefined,
        }),
      });
      if (res.ok) {
        setEditing(null);
        setEditAmount("");
        await Promise.all([refetchRecurring(), refetchTransactions()]);
      } else {
        const err = await res.json();
        console.error(err.error);
      }
    } catch (error) {
      console.error("Failed to pay:", error);
    } finally {
      setPaying(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
      if (res.ok) {
        await refetchRecurring();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const getDefaultPayDate = () => {
    if (isCurrentMonth) return new Date().toISOString().split("T")[0];
    // For past months, default to the 15th
    const d = new Date(year, month - 1, 15);
    return d.toISOString().split("T")[0];
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary" />
            Recurring
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monthly bills checklist
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-2 bg-primary/20 text-primary rounded-xl hover:bg-primary/30 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Summary */}
      <div className="p-3 bg-card rounded-xl">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Total
            </div>
            <div className="text-sm font-bold">
              {formatCurrency(totalMonthly)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Paid
            </div>
            <div className="text-sm font-bold text-emerald-400">
              {formatCurrency(paidTotal)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Remaining
            </div>
            <div className="text-sm font-bold text-red-400">
              {formatCurrency(unpaidTotal)}
            </div>
          </div>
        </div>
        {totalMonthly > 0 && (
          <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${totalMonthly > 0 ? (paidTotal / totalMonthly) * 100 : 0}%`,
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-card rounded-2xl space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Payment name (e.g. Netflix, Rent)"
                className="w-full p-2.5 bg-secondary rounded-xl text-sm outline-none"
              />
              <AmountInput
                value={amount}
                onChange={setAmount}
                className="w-full p-2.5 bg-secondary rounded-xl text-sm"
              />
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2.5 bg-secondary rounded-xl text-sm outline-none"
              >
                <option value="">Select category</option>
                {expenseCategories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                {(["needs", "wants", "savings"] as const).map((bt) => (
                  <button
                    key={bt}
                    onClick={() => setBudgetType(bt)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-medium transition-all capitalize",
                      budgetType === bt
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {bt}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsWriteOff(!isWriteOff)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all",
                  isWriteOff
                    ? "bg-amber-500/10 ring-1 ring-amber-500/30"
                    : "bg-secondary",
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                    isWriteOff
                      ? "bg-amber-500 border-amber-500"
                      : "border-muted-foreground",
                  )}
                >
                  {isWriteOff && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Write off (deductible)</span>
                </div>
              </button>
              <button
                onClick={handleAdd}
                disabled={!name || !amount || !categoryId}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50"
              >
                Add Recurring Payment
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment checklist */}
      <div className="space-y-2">
        <AnimatePresence>
          {activePayments.map((payment, i) => {
            const isPaid = paidMap.has(payment._id);
            const paidTx = paidMap.get(payment._id);
            return (
              <motion.div
                key={payment._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  isPaid
                    ? "bg-emerald-500/5 border border-emerald-500/20"
                    : "bg-secondary/50",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                    style={{
                      backgroundColor:
                        (payment.categoryId?.color || "#6366f1") + "20",
                    }}
                  >
                    {payment.categoryId?.emoji || "📦"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {payment.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="capitalize">{payment.budgetType}</span>
                      {payment.isWriteOff && (
                        <span className="text-amber-400 flex items-center gap-0.5">
                          · <FileText className="w-3 h-3" /> write-off
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-semibold shrink-0">
                    {formatCurrency(payment.amount)}
                  </div>
                  {isPaid ? (
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDelete(payment._id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isPaid ? (
                  <div className="mt-2 text-xs text-emerald-400/70 pl-12">
                    Paid{" "}
                    {paidTx
                      ? `${formatCurrency(paidTx.amount)} · ${new Date(
                          paidTx.date,
                        ).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}`
                      : ""}
                  </div>
                ) : editing === payment._id ? (
                  <div className="mt-2 pl-12 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">€</span>
                      <AmountInput
                        value={editAmount}
                        onChange={setEditAmount}
                        className="flex-1 p-1.5 bg-secondary rounded-lg text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handlePay(payment._id, getDefaultPayDate())
                        }
                        disabled={paying === payment._id || !editAmount}
                        className="flex-1 py-1.5 bg-primary/20 text-primary rounded-lg text-xs font-medium disabled:opacity-50"
                      >
                        {paying === payment._id
                          ? "Saving..."
                          : isCurrentMonth
                            ? "Confirm Today"
                            : `Confirm (${MONTH_NAMES[month - 1].slice(0, 3)} 15)`}
                      </button>
                      <button
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "date";
                          input.value = getDefaultPayDate();
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
                            handlePay(
                              payment._id,
                              (e.target as HTMLInputElement).value,
                            );
                            cleanup();
                          });
                          input.addEventListener("blur", cleanup);
                          input.showPicker?.();
                          input.focus();
                        }}
                        className="px-3 py-1.5 bg-secondary text-muted-foreground rounded-lg text-xs font-medium hover:text-foreground transition-colors"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-3 py-1.5 bg-secondary text-muted-foreground rounded-lg text-xs font-medium hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2 pl-12">
                    <button
                      onClick={() => startEditing(payment)}
                      className="flex-1 py-1.5 bg-primary/20 text-primary rounded-lg text-xs font-medium"
                    >
                      {isCurrentMonth
                        ? "Pay Today"
                        : `Pay (${MONTH_NAMES[month - 1].slice(0, 3)} 15)`}
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {activePayments.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <Repeat className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recurring payments yet</p>
          <p className="text-xs mt-1">
            Add your monthly bills and subscriptions
          </p>
        </div>
      )}
    </motion.div>
  );
}
