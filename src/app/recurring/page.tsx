"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Repeat,
  Calendar,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { CategoryType, RecurringPaymentType, BudgetType } from "@/lib/types";

export default function RecurringPage() {
  const [payments, setPayments] = useState<RecurringPaymentType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [dueDay, setDueDay] = useState("1");
  const [budgetType, setBudgetType] = useState<BudgetType>("needs");

  useEffect(() => {
    Promise.all([
      fetch("/api/recurring").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([r, c]) => {
        setPayments(r);
        setCategories(c);
      })
      .catch(console.error);
  }, []);

  const expenseCategories = categories.filter((c) => c.type === "expense");

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
          frequency,
          dueDay: parseInt(dueDay),
          budgetType,
          isActive: true,
        }),
      });
      if (res.ok) {
        const payment = await res.json();
        setPayments((prev) => [...prev, payment]);
        setName("");
        setAmount("");
        setCategoryId("");
        setShowForm(false);
      }
    } catch (error) {
      console.error("Failed to add recurring payment:", error);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/recurring/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        setPayments((prev) =>
          prev.map((p) =>
            p._id === id ? { ...p, isActive: !isActive } : p
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPayments((prev) => prev.filter((p) => p._id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const activeTotal = payments
    .filter((p) => p.isActive && p.frequency === "monthly")
    .reduce((s, p) => s + p.amount, 0);
  const quarterlyMonthly = payments
    .filter((p) => p.isActive && p.frequency === "quarterly")
    .reduce((s, p) => s + p.amount / 3, 0);
  const yearlyMonthly = payments
    .filter((p) => p.isActive && p.frequency === "yearly")
    .reduce((s, p) => s + p.amount / 12, 0);
  const totalMonthly = activeTotal + quarterlyMonthly + yearlyMonthly;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary" />
            Recurring Payments
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Independent from income — track what you owe monthly
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-2 bg-primary/20 text-primary rounded-xl hover:bg-primary/30 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Monthly cost summary */}
      <div className="p-3 bg-card rounded-xl">
        <div className="text-xs text-muted-foreground">
          Total Monthly Commitment
        </div>
        <div className="text-2xl font-bold text-red-400">
          {formatCurrency(totalMonthly)}
        </div>
        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
          <span>Monthly: {formatCurrency(activeTotal)}</span>
          <span>Quarterly/mo: {formatCurrency(quarterlyMonthly)}</span>
          <span>Yearly/mo: {formatCurrency(yearlyMonthly)}</span>
        </div>
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
                placeholder="Payment name"
                className="w-full p-2.5 bg-secondary rounded-xl text-sm outline-none"
              />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount (€)"
                step="0.01"
                className="w-full p-2.5 bg-secondary rounded-xl text-sm outline-none"
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
                {(["monthly", "quarterly", "yearly"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFrequency(f)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-medium transition-all capitalize",
                      frequency === f
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(["needs", "wants", "savings"] as const).map((bt) => (
                  <button
                    key={bt}
                    onClick={() => setBudgetType(bt)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-medium transition-all capitalize",
                      budgetType === bt
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {bt}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Due day:</span>
                <input
                  type="number"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  min="1"
                  max="31"
                  className="w-16 p-2 bg-secondary rounded-xl text-sm outline-none text-center"
                />
              </div>
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

      {/* Payment list */}
      <div className="space-y-2">
        <AnimatePresence>
          {payments.map((payment, i) => (
            <motion.div
              key={payment._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl group transition-all",
                payment.isActive
                  ? "bg-secondary/50"
                  : "bg-secondary/20 opacity-60"
              )}
            >
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{payment.frequency}</span>
                  <span>·</span>
                  <span>Day {payment.dueDay}</span>
                  <span>·</span>
                  <span className="capitalize">{payment.budgetType}</span>
                </div>
              </div>
              <div className="text-sm font-semibold text-red-400">
                {formatCurrency(payment.amount)}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    handleToggle(payment._id, payment.isActive)
                  }
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {payment.isActive ? (
                    <ToggleRight className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(payment._id)}
                  className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {payments.length === 0 && !showForm && (
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
