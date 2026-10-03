"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppData } from "@/lib/AppDataContext";
import { budgetProgress, categoryAverages } from "@/lib/budgets";
import { categoryLabel, rootOf } from "@/lib/categories";
import { logicalToday, monthKeyLabel, monthKeyOf, txMonthKey } from "@/lib/dates";
import type { BudgetEntry } from "@/lib/types";
import AmountInput from "@/components/AmountInput";

function BudgetEditor({
  initialCategoryId,
  initialAmount,
  existingIds,
  onCancel,
  onSave,
}: {
  initialCategoryId?: string;
  initialAmount?: number;
  existingIds: Set<string>;
  onCancel: () => void;
  onSave: (entry: BudgetEntry) => Promise<void>;
}) {
  const { categoryIndex, allTransactions } = useAppData();
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "");
  const [amount, setAmount] = useState(
    initialAmount ? initialAmount.toFixed(2) : "",
  );
  const [saving, setSaving] = useState(false);

  const options = categoryIndex.roots
    .filter((c) => c.type === "expense" && !c.isTax)
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((root) => [
      root,
      ...(categoryIndex.children.get(root._id) ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    ])
    .filter((c) => c._id === initialCategoryId || !existingIds.has(c._id));

  const stats = useMemo(
    () =>
      categoryId
        ? categoryAverages(allTransactions, categoryId, categoryIndex)
        : null,
    [allTransactions, categoryId, categoryIndex],
  );
  const maxMonth = stats ? Math.max(...stats.months.map((m) => m.amount), 1) : 1;
  const suggestions = stats
    ? [
        { label: "3-mo average", value: stats.average3 },
        { label: "−10%", value: stats.average3 * 0.9 },
        { label: "−25%", value: stats.average3 * 0.75 },
      ].filter((s) => s.value >= 1)
    : [];

  return (
    <div className="space-y-3 rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {initialCategoryId ? "Edit budget" : "New budget"}
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        disabled={Boolean(initialCategoryId)}
        className="w-full rounded-xl bg-secondary p-2.5 text-sm outline-none disabled:opacity-70"
      >
        <option value="">Choose a category</option>
        {options.map((c) => (
          <option key={c._id} value={c._id}>
            {c.emoji} {categoryLabel(c, categoryIndex)}
          </option>
        ))}
      </select>

      {stats ? (
        <div className="rounded-xl bg-secondary/40 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              You usually spend
            </span>
            <span className="text-lg font-bold tabular-nums">
              {formatCurrency(stats.average3)}
              <span className="text-xs font-normal text-muted-foreground">
                /mo
              </span>
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            3-month average · 6-month {formatCurrency(stats.average6)} · last
            month {formatCurrency(stats.lastMonth)}
          </div>
          <div className="mt-3 flex h-14 items-end gap-1.5">
            {stats.months.map((m) => (
              <div
                key={m.monthKey}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-sm bg-primary/60"
                    style={{
                      height: `${Math.max((m.amount / maxMonth) * 100, 3)}%`,
                    }}
                    title={formatCurrency(m.amount)}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">
                  {monthKeyLabel(m.monthKey, true).slice(0, 3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="flex gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setAmount((Math.round(s.value * 100) / 100).toFixed(2))}
              className="flex-1 rounded-xl bg-secondary/60 px-2 py-1.5 text-center"
            >
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
              <div className="text-xs font-semibold tabular-nums">
                {formatCurrency(s.value)}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-2 rounded-xl bg-secondary p-2.5">
        <span className="text-sm text-muted-foreground">€</span>
        <AmountInput
          value={amount}
          onChange={setAmount}
          className="flex-1 text-sm"
        />
        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
          per month
        </span>
      </div>

      <button
        type="button"
        disabled={!categoryId || !amount || saving}
        onClick={async () => {
          setSaving(true);
          await onSave({ categoryId, amount: parseFloat(amount) });
          setSaving(false);
        }}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save budget"}
      </button>
    </div>
  );
}

export default function BudgetsPanel() {
  const { settings, allTransactions, categoryIndex, refetchSettings } =
    useAppData();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const budgets = useMemo(() => settings?.budgets ?? [], [settings]);
  const progress = useMemo(
    () => budgetProgress(budgets, allTransactions, categoryIndex),
    [budgets, allTransactions, categoryIndex],
  );
  const existingIds = new Set(budgets.map((b) => b.categoryId));

  const today = logicalToday();
  const currentMonth = monthKeyOf(today);
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();
  const monthProgress = today.getDate() / daysInMonth;

  // Biggest spending categories this month without a budget yet.
  const unbudgeted = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of allTransactions) {
      if (t.type !== "expense" || txMonthKey(t.date) !== currentMonth) continue;
      const root = rootOf(t.categoryId, categoryIndex);
      if (!root || root.isTax || root.budgetType === "obligations") continue;
      totals.set(root._id, (totals.get(root._id) ?? 0) + t.amount);
    }
    return [...totals.entries()]
      .filter(([id]) => !existingIds.has(id))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTransactions, categoryIndex, currentMonth, budgets]);

  const save = async (next: BudgetEntry[]) => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budgets: next }),
    });
    await refetchSettings();
  };

  const upsert = async (entry: BudgetEntry) => {
    const next = budgets.some((b) => b.categoryId === entry.categoryId)
      ? budgets.map((b) => (b.categoryId === entry.categoryId ? entry : b))
      : [...budgets, entry];
    await save(next);
    setEditing(null);
  };

  const remove = async (categoryId: string) => {
    await save(budgets.filter((b) => b.categoryId !== categoryId));
  };

  const totalBudget = progress.reduce((s, p) => s + p.budget, 0);
  const totalSpent = progress.reduce((s, p) => s + p.spent, 0);

  return (
    <div className="space-y-3">
      {progress.length > 0 ? (
        <div className="rounded-xl bg-card p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Budgeted categories · {monthKeyLabel(currentMonth)}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(totalSpent)}
              <span className="text-muted-foreground">
                {" "}
                / {formatCurrency(totalBudget)}
              </span>
            </span>
          </div>
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {editing === "new" ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <BudgetEditor
              existingIds={existingIds}
              onCancel={() => setEditing(null)}
              onSave={upsert}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {progress.map((p) => {
        const category = categoryIndex.byId.get(p.categoryId);
        if (!category) return null;
        if (editing === p.categoryId) {
          return (
            <BudgetEditor
              key={p.categoryId}
              initialCategoryId={p.categoryId}
              initialAmount={p.budget}
              existingIds={existingIds}
              onCancel={() => setEditing(null)}
              onSave={upsert}
            />
          );
        }
        const pct = Math.min((p.spent / p.budget) * 100, 100);
        const color =
          p.status === "over"
            ? "bg-red-500"
            : p.status === "watch"
              ? "bg-amber-500"
              : "bg-emerald-500";
        return (
          <div key={p.categoryId} className="rounded-2xl bg-card p-3.5">
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                style={{ backgroundColor: category.color + "20" }}
              >
                {category.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {categoryLabel(category, categoryIndex)}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(p.spent)} of {formatCurrency(p.budget)}
                  {p.status === "over" ? (
                    <span className="text-red-400">
                      {" "}
                      · {formatCurrency(-p.remaining)} over
                    </span>
                  ) : p.status === "watch" ? (
                    <span className="text-amber-400">
                      {" "}
                      · on pace for {formatCurrency(p.projected)}
                    </span>
                  ) : (
                    <span className="text-emerald-400">
                      {" "}
                      · {formatCurrency(p.remaining)} left
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(p.categoryId)}
                aria-label="Edit budget"
                className="p-1.5 text-muted-foreground hover:text-primary"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => remove(p.categoryId)}
                aria-label="Remove budget"
                className="p-1.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className={cn("h-full rounded-full", color)}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6 }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-foreground/70"
                style={{ left: `${monthProgress * 100}%` }}
                title="Where you'd be if spending evenly"
              />
            </div>
          </div>
        );
      })}

      {editing !== "new" ? (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Add budget
        </button>
      ) : null}

      {unbudgeted.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            Biggest without a budget this month
          </div>
          <div className="space-y-1.5">
            {unbudgeted.map(([id, amount]) => {
              const category = categoryIndex.byId.get(id);
              if (!category) return null;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between text-xs"
                >
                  <span>
                    {category.emoji} {category.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCurrency(amount)} so far
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
