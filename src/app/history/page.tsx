"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Search, SlidersHorizontal, X } from "lucide-react";
import TransactionList from "@/components/TransactionList";
import { Segmented } from "@/components/ui";
import MonthSwitcher from "@/components/MonthSwitcher";
import { cn, formatCurrency } from "@/lib/utils";
import { useMonth } from "@/lib/MonthContext";
import { useAppData } from "@/lib/AppDataContext";
import {
  categoryWithDescendants,
  resolveCategory,
  parentOf,
} from "@/lib/categories";
import { monthKeyLabel, txMonthKey } from "@/lib/dates";
import type { TransactionType } from "@/lib/types";

type Scope = "month" | "all";
type TypeFilter = "all" | "expense" | "income";
type KindFilter = "all" | "oneoff" | "bills";

const MONTHS_PER_PAGE = 3;

export default function HistoryPage() {
  const { month, year } = useMonth();
  const { allTransactions, categoryIndex } = useAppData();

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("month");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [writeOffsOnly, setWriteOffsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [monthsShown, setMonthsShown] = useState(MONTHS_PER_PAGE);

  const selectedMonthKey = `${year}-${String(month).padStart(2, "0")}`;
  const activeFilterCount =
    (typeFilter !== "all" ? 1 : 0) +
    (categoryFilter ? 1 : 0) +
    (kind !== "all" ? 1 : 0) +
    (writeOffsOnly ? 1 : 0);
  const isFiltering = activeFilterCount > 0 || query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const categoryIds = categoryFilter
      ? categoryWithDescendants(categoryFilter, categoryIndex)
      : null;

    return allTransactions.filter((t: TransactionType) => {
      if (scope === "month" && txMonthKey(t.date) !== selectedMonthKey) {
        return false;
      }
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryIds && !categoryIds.has(t.categoryId?._id ?? "")) {
        return false;
      }
      if (kind === "bills" && !t.recurringPaymentId) return false;
      if (kind === "oneoff" && t.recurringPaymentId) return false;
      if (writeOffsOnly && !t.isWriteOff) return false;
      if (q) {
        const category = resolveCategory(t.categoryId, categoryIndex);
        const parent = parentOf(category, categoryIndex);
        const haystack = [
          t.description,
          category?.name,
          parent?.name,
          t.amount.toFixed(2),
          ...(t.tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    allTransactions,
    categoryIndex,
    categoryFilter,
    kind,
    query,
    scope,
    selectedMonthKey,
    typeFilter,
    writeOffsOnly,
  ]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let writtenOff = 0;
    for (const t of filtered) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
      if (t.type === "expense" && t.isWriteOff) writtenOff += t.amount;
    }
    return { income, expense, net: income - expense, writtenOff };
  }, [filtered]);

  const byMonth = useMemo(() => {
    const groups = new Map<string, TransactionType[]>();
    for (const t of filtered) {
      const key = txMonthKey(t.date);
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [filtered]);

  const categoryOptions = (type: "expense" | "income") =>
    categoryIndex.roots
      .filter((category) => category.type === type)
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((root) => [
        { id: root._id, label: `${root.emoji} ${root.name}` },
        ...(categoryIndex.children.get(root._id) ?? [])
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((child) => ({
            id: child._id,
            label: `    ${child.emoji} ${child.name}`,
          })),
      ]);

  const clearFilters = () => {
    setTypeFilter("all");
    setCategoryFilter("");
    setKind("all");
    setWriteOffsOnly(false);
    setQuery("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <Clock className="h-5 w-5 text-primary" />
            History
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {filtered.length} transaction{filtered.length === 1 ? "" : "s"}
            {scope === "all" ? " · all time" : ""}
          </p>
        </div>
        <div className="w-40">
          <Segmented
            value={scope}
            onChange={(value) => {
              setScope(value);
              setMonthsShown(MONTHS_PER_PAGE);
            }}
            options={[
              { value: "month", label: "Month" },
              { value: "all", label: "All time" },
            ]}
          />
        </div>
      </div>

      {scope === "month" ? <MonthSwitcher /> : null}

      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-card px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search description, category, amount"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground/50"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-medium transition-colors",
            showFilters || activeFilterCount > 0
              ? "bg-primary/15 text-primary"
              : "bg-card text-muted-foreground",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showFilters ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 rounded-2xl bg-card p-3">
              <Segmented
                value={typeFilter}
                onChange={(value) => {
                  setTypeFilter(value);
                  setCategoryFilter("");
                }}
                options={[
                  { value: "all", label: "All" },
                  { value: "expense", label: "Expenses" },
                  { value: "income", label: "Income" },
                ]}
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-xl bg-secondary/50 p-2.5 text-sm outline-none"
              >
                <option value="">All categories</option>
                {typeFilter !== "income" ? (
                  <optgroup label="Expenses">
                    {categoryOptions("expense").map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {typeFilter !== "expense" ? (
                  <optgroup label="Income">
                    {categoryOptions("income").map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              <Segmented
                value={kind}
                onChange={setKind}
                options={[
                  { value: "all", label: "Everything" },
                  { value: "oneoff", label: "One-off" },
                  { value: "bills", label: "Bills" },
                ]}
              />
              <button
                type="button"
                onClick={() => setWriteOffsOnly((v) => !v)}
                className={cn(
                  "w-full rounded-xl py-2 text-xs font-medium transition-all",
                  writeOffsOnly
                    ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
                    : "bg-secondary/50 text-muted-foreground",
                )}
              >
                Write-offs only
              </button>
              {activeFilterCount > 0 || query ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full py-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Clear all
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex items-center justify-between rounded-xl bg-card p-3">
        <div className="flex-1 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Income
          </div>
          <div className="text-sm font-semibold text-emerald-400 tabular-nums">
            {formatCurrency(totals.income)}
          </div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex-1 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {writeOffsOnly ? "Written off" : "Expenses"}
          </div>
          <div
            className={cn(
              "text-sm font-semibold tabular-nums",
              writeOffsOnly ? "text-amber-400" : "text-red-400",
            )}
          >
            {formatCurrency(writeOffsOnly ? totals.writtenOff : totals.expense)}
          </div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex-1 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Net
          </div>
          <div
            className={cn(
              "text-sm font-semibold tabular-nums",
              totals.net >= 0 ? "text-emerald-400" : "text-red-400",
            )}
          >
            {formatCurrency(totals.net)}
          </div>
        </div>
      </div>

      {scope === "month" ? (
        <TransactionList
          transactions={filtered}
          expandAll={isFiltering}
          emptyLabel={isFiltering ? "Nothing matches" : "No transactions yet"}
        />
      ) : byMonth.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nothing matches
        </div>
      ) : (
        <div className="space-y-5">
          {byMonth.slice(0, monthsShown).map(([key, list]) => {
            const net = list.reduce(
              (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
              0,
            );
            return (
              <section key={key} className="space-y-2">
                <div className="flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-semibold">{monthKeyLabel(key)}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {list.length} · {net >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(net))}
                  </span>
                </div>
                <TransactionList transactions={list} expandAll={isFiltering} />
              </section>
            );
          })}
          {byMonth.length > monthsShown ? (
            <button
              type="button"
              onClick={() => setMonthsShown((n) => n + MONTHS_PER_PAGE)}
              className="w-full rounded-xl bg-card py-2.5 text-xs font-medium text-muted-foreground"
            >
              Show earlier months ({byMonth.length - monthsShown} more)
            </button>
          ) : null}
        </div>
      )}
    </motion.div>
  );
}
