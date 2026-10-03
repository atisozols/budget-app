"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ChartPie,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Lightbulb,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppData } from "@/lib/AppDataContext";
import { useSpendable, useTaxRates } from "@/lib/useFinance";
import {
  computeMonthReview,
  computePeriodStats,
  periodLabel,
  periodOf,
  shiftPeriod,
  type Period,
  type PeriodKind,
  type SpendFilter,
} from "@/lib/periodInsights";
import { computeTaxYear } from "@/lib/tax";
import { isTaxPayment } from "@/lib/categories";
import {
  dateKeyToDate,
  logicalToday,
  logicalTodayKey,
  monthKeyLabel,
  MONTH_SHORT,
  shiftMonthKey,
  txDateKey,
  txMonthKey,
} from "@/lib/dates";
import TaxCard from "@/components/insights/TaxCard";

const FILTERS: { id: SpendFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs", label: "Needs" },
  { id: "wants", label: "Wants" },
  { id: "oneoff", label: "One-off" },
  { id: "bills", label: "Bills" },
  { id: "writeoffs", label: "Write-offs" },
];

function Delta({ now, before }: { now: number; before: number }) {
  if (before <= 0) return null;
  const pct = ((now - before) / before) * 100;
  if (Math.abs(pct) < 1) return null;
  const up = pct > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-semibold",
        up ? "text-red-400" : "text-emerald-400",
      )}
    >
      {up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

function ReviewCard({
  reviewMonth,
  onOpen,
  compact,
}: {
  reviewMonth: string;
  onOpen?: () => void;
  compact?: boolean;
}) {
  const { allTransactions, categoryIndex, settings } = useAppData();
  const rates = useTaxRates();
  const review = useMemo(
    () =>
      computeMonthReview({
        transactions: allTransactions,
        monthKey: reviewMonth,
        index: categoryIndex,
        rates,
        goal: settings?.savingsGoal ?? 0,
      }),
    [allTransactions, categoryIndex, rates, reviewMonth, settings],
  );
  const hit = review.goal > 0 ? review.kept >= review.goal : review.kept >= 0;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        hit
          ? "border-emerald-500/25 bg-emerald-500/[0.06]"
          : "border-amber-500/25 bg-amber-500/[0.06]",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <ClipboardCheck className="h-3.5 w-3.5" />
          {monthKeyLabel(reviewMonth)} review
        </div>
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="text-xs font-medium text-primary"
          >
            Open month
          </button>
        ) : null}
      </div>
      <div className="mt-1 text-lg font-bold">
        {review.goal > 0
          ? hit
            ? `Goal hit: kept ${formatCurrency(review.kept)}`
            : review.kept >= 0
              ? `Kept ${formatCurrency(review.kept)}, ${formatCurrency(review.goal - review.kept)} short of the goal`
              : `Spent ${formatCurrency(-review.kept)} more than came in`
          : `Kept ${formatCurrency(review.kept)}`}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        In {formatCurrency(review.income)} (usually{" "}
        {formatCurrency(review.usualIncome)}) · out{" "}
        {formatCurrency(review.spent)} (usually {formatCurrency(review.usualSpent)})
      </div>

      {!compact && review.lines.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {review.lines.map((line) => (
            <div
              key={line.category._id}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span>{line.category.emoji}</span>
                <span className="truncate">{line.category.name}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatCurrency(line.amount)}
                <span
                  className={cn(
                    "ml-1.5",
                    line.delta > 0 ? "text-red-400" : "text-emerald-400",
                  )}
                >
                  {line.delta > 0 ? "+" : "−"}
                  {formatCurrency(Math.abs(line.delta))} vs usual
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {review.suggestion ? (
        <div className="mt-3 flex gap-2 rounded-xl bg-background/40 p-2.5 text-xs">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>{review.suggestion}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function InsightsPage() {
  const { allTransactions, categoryIndex, settings } = useAppData();
  const rates = useTaxRates();
  const spendable = useSpendable();
  const today = logicalToday();
  const todayKey = logicalTodayKey();
  const currentMonth = todayKey.slice(0, 7);

  const [kind, setKind] = useState<PeriodKind>("month");
  const [period, setPeriod] = useState<Period>(() => periodOf("month", today));
  const [filter, setFilter] = useState<SpendFilter>("all");
  const [openRoot, setOpenRoot] = useState<string | null>(null);
  const [showWriteOffs, setShowWriteOffs] = useState(false);

  const changeKind = (next: PeriodKind) => {
    setKind(next);
    setPeriod(periodOf(next, today));
  };

  const stats = useMemo(
    () =>
      computePeriodStats({
        transactions: allTransactions,
        period,
        index: categoryIndex,
        rates,
        filter,
        todayKey: logicalTodayKey(),
      }),
    [allTransactions, period, categoryIndex, rates, filter],
  );

  const isFuture = stats.months[0] > currentMonth;
  const isCurrentPeriod = stats.months.includes(currentMonth);
  const goal = settings?.savingsGoal ?? 0;
  const periodGoal = goal * stats.months.filter((m) => m <= currentMonth).length;
  const afterTaxIncome = stats.income - stats.taxOwed;
  const lastMonth = shiftMonthKey(currentMonth, -1);
  const showLastMonthReview =
    kind === "month" && isCurrentPeriod && today.getDate() <= 10;
  const reviewThisPeriod =
    kind === "month" && stats.months[0] < currentMonth ? stats.months[0] : null;

  // Monthly bars for quarter / year views
  const monthlyBars = useMemo(() => {
    if (kind === "month") return [];
    const [y] = stats.months[0].split("-").map(Number);
    const tax = computeTaxYear(allTransactions, y, categoryIndex, rates);
    return stats.months
      .filter((key) => key <= currentMonth)
      .map((key) => {
        let income = 0;
        let spent = 0;
        for (const t of allTransactions) {
          if (txMonthKey(t.date) !== key) continue;
          if (t.type === "income") income += t.amount;
          else if (!isTaxPayment(t, categoryIndex)) spent += t.amount;
        }
        const m = Number(key.slice(5, 7)) - 1;
        return {
          label: MONTH_SHORT[m],
          income,
          spent,
          kept: income - spent - tax.months[m].total,
        };
      });
  }, [kind, stats.months, allTransactions, categoryIndex, rates, currentMonth]);

  const maxBreakdown = Math.max(...stats.breakdown.map((b) => b.amount), 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <ChartPie className="h-5 w-5 text-primary" />
          Insights
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Where the money went, what you kept, and your tax
        </p>
      </div>

      {/* Period picker */}
      <div className="space-y-2">
        <div className="flex gap-1 rounded-xl bg-secondary/50 p-1">
          {(["month", "quarter", "year"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => changeKind(k)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-all",
                kind === k
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPeriod((p) => shiftPeriod(p, -1))}
            aria-label="Previous period"
            className="rounded-xl bg-secondary p-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPeriod(periodOf(kind, today))}
            className="text-sm font-semibold"
          >
            {periodLabel(period)}
            {isCurrentPeriod ? (
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                (now)
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setPeriod((p) => shiftPeriod(p, 1))}
            disabled={isCurrentPeriod || isFuture}
            aria-label="Next period"
            className="rounded-xl bg-secondary p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showLastMonthReview ? (
        <ReviewCard
          reviewMonth={lastMonth}
          compact
          onOpen={() => {
            const [y, m] = lastMonth.split("-").map(Number);
            setPeriod({ kind: "month", year: y, index: m - 1 });
          }}
        />
      ) : null}
      {reviewThisPeriod ? <ReviewCard reviewMonth={reviewThisPeriod} /> : null}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-card p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Income
          </div>
          <div className="text-lg font-bold text-emerald-400 tabular-nums">
            {formatCurrency(stats.income)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {stats.taxOwed > 0.5
              ? `${formatCurrency(stats.taxOwed)} tax on bruto`
              : "no tax on bruto yet"}
          </div>
        </div>
        <div className="rounded-2xl bg-card p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Spent
          </div>
          <div className="text-lg font-bold text-red-400 tabular-nums">
            {formatCurrency(stats.spent)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {formatCurrency(stats.oneOff / stats.days)}/day one-off ·{" "}
            {formatCurrency(stats.bills)} bills
          </div>
        </div>
        <div
          className={cn(
            "col-span-2 rounded-2xl border p-3",
            stats.kept >= periodGoal
              ? "border-emerald-500/25 bg-emerald-500/[0.06]"
              : "border-red-500/25 bg-red-500/[0.06]",
          )}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Kept (income − tax − spending)
            </span>
            {periodGoal > 0 ? (
              <span className="text-[10px] text-muted-foreground">
                goal {formatCurrency(periodGoal)}
              </span>
            ) : null}
          </div>
          <div
            className={cn(
              "text-2xl font-bold tabular-nums",
              stats.kept >= 0 ? "text-foreground" : "text-red-400",
            )}
          >
            {stats.kept < 0 ? "−" : ""}
            {formatCurrency(Math.abs(stats.kept))}
          </div>
          {afterTaxIncome > 0 ? (
            <div className="text-[11px] text-muted-foreground">
              {((stats.kept / afterTaxIncome) * 100).toFixed(0)}% of after-tax
              income
              {isCurrentPeriod ? " so far" : ""}
              {isCurrentPeriod && spendable.billsUnpaid > 0
                ? ` · ${formatCurrency(spendable.billsUnpaid)} of bills still due`
                : ""}
            </div>
          ) : null}
        </div>
      </div>

      {monthlyBars.length > 1 ? (
        <div className="rounded-2xl bg-card p-4">
          <SectionTitle>Income vs spending by month</SectionTitle>
          <div className="-mx-2 h-44 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyBars} barGap={2}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                  tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`}
                />
                <Bar dataKey="income" fill="#34d399" radius={[3, 3, 0, 0]} />
                <Bar dataKey="spent" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {monthlyBars.map((m) => (
              <span
                key={m.label}
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                  m.kept >= goal
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-red-500/10 text-red-400",
                )}
              >
                {m.label} {m.kept < 0 ? "−" : "+"}
                {formatCurrency(Math.abs(m.kept))}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Spending breakdown */}
      <div className="rounded-2xl bg-card p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Spending by category
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
            {formatCurrency(stats.filteredSpent)}
            <Delta now={stats.filteredSpent} before={stats.previousFilteredSpent} />
          </span>
        </div>
        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                filter === f.id
                  ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/30"
                  : "bg-secondary/60 text-muted-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {stats.breakdown.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            Nothing here for this period
          </div>
        ) : (
          <div className="space-y-1">
            {stats.breakdown.map((row) => {
              const isOpen = openRoot === row.category._id;
              const hasChildren = row.children.length > 0;
              const pct =
                stats.filteredSpent > 0
                  ? (row.amount / stats.filteredSpent) * 100
                  : 0;
              return (
                <div key={row.category._id}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenRoot(isOpen ? null : row.category._id)
                    }
                    className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-secondary/30"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
                      style={{ backgroundColor: row.category.color + "20" }}
                    >
                      {row.category.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-baseline justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-1 truncate">
                          {row.category.name}
                          {hasChildren ? (
                            <ChevronDown
                              className={cn(
                                "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
                                isOpen && "rotate-180",
                              )}
                            />
                          ) : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                          <Delta now={row.amount} before={row.previous} />
                          {formatCurrency(row.amount)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(row.amount / maxBreakdown) * 100}%`,
                            backgroundColor: row.category.color,
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                      {pct.toFixed(0)}%
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && hasChildren ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-12 space-y-1 border-l border-border/60 py-1 pl-3">
                          {[
                            ...row.children,
                            ...(row.direct > 0
                              ? [
                                  {
                                    category: { ...row.category, name: "General" },
                                    amount: row.direct,
                                    count: 0,
                                  },
                                ]
                              : []),
                          ].map((child) => (
                            <div
                              key={child.category._id + child.category.name}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="flex items-center gap-1.5">
                                <span>{child.category.emoji}</span>
                                <span>{child.category.name}</span>
                              </span>
                              <span className="tabular-nums text-muted-foreground">
                                {formatCurrency(child.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top places + biggest */}
      {stats.topDescriptions.length > 0 || stats.biggest.length > 0 ? (
        <div className="grid gap-3">
          {stats.topDescriptions.length > 0 ? (
            <div className="rounded-2xl bg-card p-4">
              <SectionTitle>Where it went most</SectionTitle>
              <div className="space-y-1.5">
                {stats.topDescriptions.map((d) => (
                  <div
                    key={d.description}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span>{d.emoji}</span>
                      <span className="truncate">{d.description}</span>
                      <span className="shrink-0 text-muted-foreground">
                        ×{d.count}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatCurrency(d.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {stats.biggest.length > 0 ? (
            <div className="rounded-2xl bg-card p-4">
              <SectionTitle>Biggest single purchases</SectionTitle>
              <div className="space-y-1.5">
                {stats.biggest.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span>{t.categoryId?.emoji ?? "📦"}</span>
                      <span className="truncate">
                        {t.description || t.categoryId?.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {format(dateKeyToDate(txDateKey(t.date)), "MMM d")}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 50 / 30 / 20 */}
      {afterTaxIncome > 0 ? (
        <div className="rounded-2xl bg-card p-4">
          <SectionTitle>50 / 30 / 20 · share of after-tax income</SectionTitle>
          <div className="space-y-2.5">
            {[
              { label: "Needs", value: stats.needs, target: 50, color: "#6366f1", over: true },
              { label: "Wants", value: stats.wants, target: 30, color: "#f59e0b", over: true },
              { label: "Kept", value: stats.kept, target: 20, color: "#22c55e", over: false },
            ].map((row) => {
              const pct = (row.value / afterTaxIncome) * 100;
              const good = row.over ? pct <= row.target : pct >= row.target;
              return (
                <div key={row.label}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span>
                      {row.label}{" "}
                      <span className="text-muted-foreground">
                        ({row.over ? "≤" : "≥"}
                        {row.target}%)
                      </span>
                    </span>
                    <span className="tabular-nums">
                      <span className={good ? "text-emerald-400" : "text-red-400"}>
                        {pct.toFixed(0)}%
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatCurrency(row.value)}
                      </span>
                    </span>
                  </div>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(pct, 100))}%`,
                        backgroundColor: row.color,
                      }}
                    />
                    <div
                      className="absolute top-0 h-full w-0.5 bg-foreground/60"
                      style={{ left: `${row.target}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stats.obligations > 0 ? (
              <div className="text-[11px] text-muted-foreground">
                Plus {formatCurrency(stats.obligations)} debt repayment, not
                counted as needs or wants.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Write-offs */}
      <div className="overflow-hidden rounded-2xl bg-card">
        <button
          type="button"
          onClick={() => setShowWriteOffs((v) => !v)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
        >
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              Written off · {periodLabel(period)}
            </div>
            <div className="mt-1 text-xl font-bold text-amber-400 tabular-nums">
              {formatCurrency(stats.writeOffs)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {stats.writeOffItems.length} item
              {stats.writeOffItems.length === 1 ? "" : "s"}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              showWriteOffs && "rotate-180",
            )}
          />
        </button>
        <AnimatePresence initial={false}>
          {showWriteOffs && stats.writeOffItems.length > 0 ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-1 px-4 pb-4">
                {stats.writeOffItems.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 text-muted-foreground">
                        {format(dateKeyToDate(txDateKey(t.date)), "MMM d")}
                      </span>
                      <span>{t.categoryId?.emoji ?? "📦"}</span>
                      <span className="truncate">
                        {t.description || t.categoryId?.name}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Tax */}
      <TaxCard
        year={period.year}
        highlightMonth={kind === "month" ? period.index : undefined}
      />

      {/* Income */}
      {stats.incomeByCategory.length > 0 ? (
        <div className="rounded-2xl bg-card p-4">
          <SectionTitle>Income by source</SectionTitle>
          <div className="space-y-1.5">
            {stats.incomeByCategory.map((row) => (
              <div
                key={row.category._id}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <span>{row.category.emoji}</span>
                  <span>{row.category.name}</span>
                  {row.bruto > 0 ? (
                    <span className="rounded bg-primary/10 px-1 text-[9px] font-medium text-primary">
                      bruto
                    </span>
                  ) : null}
                </span>
                <span className="font-medium tabular-nums text-emerald-400">
                  {formatCurrency(row.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
