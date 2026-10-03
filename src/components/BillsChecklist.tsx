"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Repeat,
  Check,
  Calendar,
  FileText,
  Pencil,
  CalendarRange,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { TransactionType, RecurringPaymentType } from "@/lib/types";
import AmountInput from "@/components/AmountInput";
import MonthSwitcher from "@/components/MonthSwitcher";
import { useMonth } from "@/lib/MonthContext";
import { useAppData } from "@/lib/AppDataContext";
import { categoryLabel } from "@/lib/categories";
import { logicalTodayKey, MONTH_NAMES, txMonthKey } from "@/lib/dates";

const SMALL_BILL = 25;

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

export default function BillsChecklist() {
  const { month, year, isCurrentMonth } = useMonth();
  const {
    recurring: payments,
    categoryIndex,
    allTransactions,
    refetchRecurring,
    refetchTransactions,
  } = useAppData();

  const [showForm, setShowForm] = useState(false);
  const [showYearly, setShowYearly] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isWriteOff, setIsWriteOff] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editConfigAmount, setEditConfigAmount] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  // recurringPaymentId → transaction paid in the selected month
  const paidMap = useMemo(() => {
    const map = new Map<string, TransactionType>();
    for (const t of allTransactions) {
      if (t.recurringPaymentId && txMonthKey(t.date) === monthKey) {
        map.set(String(t.recurringPaymentId), t);
      }
    }
    return map;
  }, [allTransactions, monthKey]);

  const activePayments = payments.filter((p) => {
    if (!p.isActive) return false;
    return !p.startDate || txMonthKey(p.startDate) <= monthKey;
  });
  const paidTotal = activePayments
    .filter((p) => paidMap.has(p._id))
    .reduce((s, p) => s + (paidMap.get(p._id)?.amount ?? p.amount), 0);
  const unpaidTotal = activePayments
    .filter((p) => !paidMap.has(p._id))
    .reduce((s, p) => s + p.amount, 0);
  const totalMonthly = paidTotal + unpaidTotal;

  // Yearly view uses every currently active bill at its default price.
  const currentBills = payments.filter((p) => p.isActive);
  const monthlyFixed = currentBills.reduce((s, p) => s + p.amount, 0);
  const smallBills = currentBills.filter((p) => p.amount < SMALL_BILL);
  const smallYearly = smallBills.reduce((s, p) => s + p.amount, 0) * 12;

  const categoryOptions = categoryIndex.roots
    .filter((c) => c.type === "expense")
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((root) => [
      root,
      ...(categoryIndex.children.get(root._id) ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    ]);

  const handleAdd = async () => {
    if (!name || !amount || !categoryId) return;
    try {
      setActionMessage(null);
      const category = categoryIndex.byId.get(categoryId);
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          amount: parseFloat(amount),
          categoryId,
          frequency: "monthly",
          dueDay: 1,
          budgetType: category?.budgetType ?? "needs",
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
      } else {
        const err = await res.json().catch(() => null);
        setActionMessage(err?.error || "Failed to add bill");
      }
    } catch (error) {
      console.error("Failed to add recurring payment:", error);
      setActionMessage("Failed to add bill");
    }
  };

  const getDefaultPayDate = () =>
    isCurrentMonth ? logicalTodayKey() : `${monthKey}-15`;

  const handlePay = async (paymentId: string, dateStr: string) => {
    setPaying(paymentId);
    try {
      setActionMessage(null);
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
        const err = await res.json().catch(() => null);
        setActionMessage(err?.error || "Failed to log bill payment");
      }
    } catch (error) {
      console.error("Failed to pay:", error);
      setActionMessage("Failed to log bill payment");
    } finally {
      setPaying(null);
    }
  };

  const handleUpdateConfig = async (paymentId: string) => {
    const newAmount = parseFloat(editConfigAmount);
    if (isNaN(newAmount) || newAmount <= 0) return;
    try {
      setActionMessage(null);
      const res = await fetch(`/api/recurring/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: newAmount }),
      });
      if (res.ok) {
        setEditingConfig(null);
        setEditConfigAmount("");
        await refetchRecurring();
      } else {
        const err = await res.json().catch(() => null);
        setActionMessage(err?.error || "Failed to update price");
      }
    } catch (error) {
      console.error("Failed to update recurring payment config:", error);
      setActionMessage("Failed to update price");
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete(null);
    try {
      const res = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
      if (res.ok) await refetchRecurring();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const startPaying = (payment: RecurringPaymentType) => {
    setEditing(payment._id);
    setEditAmount(payment.amount.toString());
    setEditingConfig(null);
  };

  const startEditingConfig = (payment: RecurringPaymentType) => {
    setEditingConfig(payment._id);
    setEditConfigAmount(payment.amount.toString());
    setEditing(null);
  };

  const shortMonth = MONTH_NAMES[month - 1].slice(0, 3);

  return (
    <div className="space-y-4">
      <MonthSwitcher />

      {/* Summary */}
      <div className="rounded-xl bg-card p-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Total</div>
            <div className="text-sm font-bold tabular-nums">
              {formatCurrency(totalMonthly)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Paid</div>
            <div className="text-sm font-bold text-emerald-400 tabular-nums">
              {formatCurrency(paidTotal)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">
              Remaining
            </div>
            <div className="text-sm font-bold text-red-400 tabular-nums">
              {formatCurrency(unpaidTotal)}
            </div>
          </div>
        </div>
        {totalMonthly > 0 && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${(paidTotal / totalMonthly) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}
      </div>

      {/* Yearly cost */}
      <div className="rounded-2xl bg-card p-4">
        <button
          type="button"
          onClick={() => setShowYearly((v) => !v)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <CalendarRange className="h-3.5 w-3.5" />
              Bills over a year
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {formatCurrency(monthlyFixed * 12)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(monthlyFixed)}/month · {currentBills.length} bills
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Under €{SMALL_BILL} each
            </div>
            <div className="mt-1 text-lg font-bold text-amber-400 tabular-nums">
              {formatCurrency(smallYearly)}
            </div>
            <div className="text-xs text-muted-foreground">
              {smallBills.length} small ones / year
            </div>
          </div>
        </button>
        <AnimatePresence initial={false}>
          {showYearly ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
                {[...currentBills]
                  .sort((a, b) => b.amount - a.amount)
                  .map((bill) => (
                    <div
                      key={bill._id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span>{bill.categoryId?.emoji ?? "📦"}</span>
                        <span className="truncate">{bill.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatCurrency(bill.amount)} ×12 ={" "}
                        <span className="font-semibold text-foreground">
                          {formatCurrency(bill.amount * 12)}
                        </span>
                      </span>
                    </div>
                  ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {actionMessage ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          {actionMessage}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Add bill
      </button>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-2xl bg-card p-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bill name (e.g. Netflix, Rent)"
                className="w-full rounded-xl bg-secondary p-2.5 text-sm outline-none"
              />
              <AmountInput
                value={amount}
                onChange={setAmount}
                className="w-full rounded-xl bg-secondary p-2.5 text-sm"
              />
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl bg-secondary p-2.5 text-sm outline-none"
              >
                <option value="">Select category</option>
                {categoryOptions.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.emoji} {categoryLabel(c, categoryIndex)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsWriteOff(!isWriteOff)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl p-2.5 transition-all",
                  isWriteOff
                    ? "bg-amber-500/10 ring-1 ring-amber-500/30"
                    : "bg-secondary",
                )}
              >
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border-2 transition-all",
                    isWriteOff
                      ? "border-amber-500 bg-amber-500"
                      : "border-muted-foreground",
                  )}
                >
                  {isWriteOff && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Write off (deductible)</span>
                </div>
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!name || !amount || !categoryId}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Add bill
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checklist */}
      <div className="space-y-2">
        {activePayments.map((payment) => {
          const isPaid = paidMap.has(payment._id);
          const paidTx = paidMap.get(payment._id);
          const priceDiffers =
            paidTx && Math.abs(paidTx.amount - payment.amount) >= 0.01;
          return (
            <div
              key={payment._id}
              className={cn(
                "rounded-xl p-3 transition-all",
                isPaid
                  ? "border border-emerald-500/20 bg-emerald-500/5"
                  : "bg-secondary/50",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                  style={{
                    backgroundColor:
                      (payment.categoryId?.color || "#6366f1") + "20",
                  }}
                >
                  {payment.categoryId?.emoji || "📦"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {payment.name}
                  </div>
                  <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <span className="truncate">
                      {categoryLabel(payment.categoryId, categoryIndex)}
                    </span>
                    {payment.isWriteOff && (
                      <span className="flex shrink-0 items-center gap-0.5 text-amber-400">
                        · <FileText className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold tabular-nums">
                    {formatCurrency(payment.amount)}
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    {formatCurrency(payment.amount * 12)}/yr
                  </div>
                </div>
                {isPaid ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEditingConfig(payment)}
                      className="p-1.5 text-muted-foreground transition-colors hover:text-primary"
                      aria-label="Edit price"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {confirmDelete === payment._id ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(payment._id)}
                        onBlur={() => setConfirmDelete(null)}
                        className="rounded-lg bg-destructive/15 px-2 py-1 text-[10px] font-semibold text-destructive"
                      >
                        Remove?
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(payment._id)}
                        className="p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Remove bill"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isPaid ? (
                <div className="mt-2 pl-12 text-xs text-emerald-400/70">
                  Paid{" "}
                  {paidTx
                    ? `${formatCurrency(paidTx.amount)} · ${new Date(
                        paidTx.date,
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      })}`
                    : ""}
                  {priceDiffers ? (
                    <span className="ml-1 text-amber-400">
                      (usually {formatCurrency(payment.amount)})
                    </span>
                  ) : null}
                </div>
              ) : editingConfig === payment._id ? (
                <div className="mt-2 space-y-2 pl-12">
                  <div className="text-xs text-muted-foreground">
                    Update default price (won&apos;t affect past payments)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">€</span>
                    <AmountInput
                      value={editConfigAmount}
                      onChange={setEditConfigAmount}
                      className="flex-1 rounded-lg bg-secondary p-1.5 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateConfig(payment._id)}
                      disabled={
                        !editConfigAmount || parseFloat(editConfigAmount) <= 0
                      }
                      className="flex-1 rounded-lg bg-primary/20 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
                    >
                      Save price
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingConfig(null)}
                      className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : editing === payment._id ? (
                <div className="mt-2 space-y-2 pl-12">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">€</span>
                    <AmountInput
                      value={editAmount}
                      onChange={setEditAmount}
                      className="flex-1 rounded-lg bg-secondary p-1.5 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handlePay(payment._id, getDefaultPayDate())}
                      disabled={paying === payment._id || !editAmount}
                      className="flex-1 rounded-lg bg-primary/20 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
                    >
                      {paying === payment._id
                        ? "Saving..."
                        : isCurrentMonth
                          ? "Confirm today"
                          : `Confirm (${shortMonth} 15)`}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openNativeDatePicker(getDefaultPayDate(), (value) =>
                          handlePay(payment._id, value),
                        )
                      }
                      aria-label="Pick payment date"
                      className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex gap-2 pl-12">
                  <button
                    type="button"
                    onClick={() => startPaying(payment)}
                    className="flex-1 rounded-lg bg-primary/20 py-1.5 text-xs font-medium text-primary"
                  >
                    {isCurrentMonth ? "Pay today" : `Pay (${shortMonth} 15)`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activePayments.length === 0 && !showForm && (
        <div className="py-12 text-center text-muted-foreground">
          <Repeat className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No bills yet</p>
          <p className="mt-1 text-xs">Add your monthly bills and subscriptions</p>
        </div>
      )}
    </div>
  );
}
