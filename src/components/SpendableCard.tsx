"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Compass, Hourglass } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { monthKeyLabel, MONTH_NAMES } from "@/lib/dates";
import type { SpendableResult } from "@/lib/spendable";

function Row({
  label,
  value,
  sign,
  muted,
  strong,
}: {
  label: React.ReactNode;
  value: number;
  sign?: "+" | "−";
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 text-xs",
        strong && "border-t border-border/50 pt-1.5 text-sm font-semibold",
        muted && "text-muted-foreground",
      )}
    >
      <span className={cn(!strong && "text-muted-foreground")}>{label}</span>
      <span className="tabular-nums">
        {sign ?? (value < 0 ? "−" : "")}
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

export function SpendableBreakdown({ result }: { result: SpendableResult }) {
  const taxReleased = result.tax.total < 0;
  return (
    <div className="space-y-1.5">
      <Row label="Income received" value={result.incomeReceived} sign="+" />
      {result.incomePending > 0 ? (
        <Row
          label="Regular income still to come"
          value={result.incomePending}
          sign="+"
        />
      ) : null}
      <Row
        label={taxReleased ? "Tax released (write-offs)" : "Tax set aside"}
        value={Math.abs(result.tax.total)}
        sign={taxReleased ? "+" : "−"}
      />
      <Row label="Savings goal" value={result.goal} sign="−" />
      <Row
        label={
          <>
            Bills{" "}
            <span className="text-muted-foreground/60">
              ({formatCurrency(result.billsPaid)} paid ·{" "}
              {formatCurrency(result.billsUnpaid)} due)
            </span>
          </>
        }
        value={result.billsDue}
        sign="−"
      />
      {result.carryOver !== 0 ? (
        <Row
          label="Carried over from earlier months"
          value={Math.abs(result.carryOver)}
          sign={result.carryOver >= 0 ? "+" : "−"}
        />
      ) : null}
      <Row label="Spendable this month" value={result.spendable} strong />
      <Row label="Spent so far (excl. bills & tax)" value={result.spent} sign="−" />
      <Row label="Left" value={result.left} strong />
    </div>
  );
}

export default function SpendableCard({
  result,
  expandable = true,
  defaultExpanded = false,
}: {
  result: SpendableResult;
  expandable?: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const monthName = MONTH_NAMES[Number(result.monthKey.slice(5, 7)) - 1];
  const isOver = result.left < 0;
  const keptIfOver = result.goal - result.overPlan;

  if (!result.hasGoal) {
    return (
      <Link
        href="/plan"
        className="block rounded-2xl border border-primary/20 bg-primary/5 p-4"
      >
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <Compass className="h-3.5 w-3.5 text-primary" />
          Spendable
        </div>
        <div className="mt-1 text-sm font-semibold">
          Set a monthly savings goal to see what you can spend
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Plan → Overview
        </div>
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border",
        isOver
          ? "border-amber-500/25 bg-amber-500/[0.06]"
          : "border-emerald-500/25 bg-emerald-500/[0.06]",
      )}
    >
      <button
        type="button"
        onClick={() => expandable && setExpanded((v) => !v)}
        className="w-full p-4 text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Compass
              className={cn(
                "h-3.5 w-3.5",
                isOver ? "text-amber-400" : "text-emerald-400",
              )}
            />
            Left to spend · {monthName}
          </div>
          {expandable ? (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
            />
          ) : null}
        </div>

        <div className="mt-1 text-4xl font-bold tabular-nums tracking-tight">
          {formatCurrency(Math.max(0, result.left))}
        </div>

        <div className="mt-1 text-xs text-muted-foreground">
          {!isOver ? (
            <>
              <span className="font-semibold text-foreground">
                {formatCurrency(result.perDay)}/day
              </span>{" "}
              for {result.daysLeft} day{result.daysLeft === 1 ? "" : "s"} ·{" "}
              {formatCurrency(result.goal)} goal kept aside
            </>
          ) : keptIfOver >= 0 ? (
            <span className="text-amber-300">
              {formatCurrency(result.overPlan)} past this month&apos;s plan. You&apos;d
              still keep {formatCurrency(keptIfOver)} of your{" "}
              {formatCurrency(result.goal)} goal.
            </span>
          ) : (
            <span className="text-amber-300">
              {formatCurrency(result.overPlan)} past this month&apos;s plan, which is{" "}
              {formatCurrency(-keptIfOver)} more than your{" "}
              {formatCurrency(result.goal)} goal can absorb.
            </span>
          )}
        </div>

        {result.expected.length > 0 ? (
          <div className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-background/40 px-2.5 py-2 text-[11px] text-muted-foreground">
            <Hourglass className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              Counting regular income still to come:{" "}
              {result.expected
                .map(
                  (e) =>
                    `${e.emoji} ${e.name} ${formatCurrency(e.pending)}${e.isBruto ? ` (~${formatCurrency(e.afterTax)} after tax)` : ""}`,
                )
                .join(" · ")}
            </span>
          </div>
        ) : null}
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <SpendableBreakdown result={result} />
              {result.history.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.history.map((month) => (
                    <span
                      key={month.monthKey}
                      className={cn(
                        "rounded-lg px-2 py-1 text-[10px] font-medium",
                        month.vsGoal >= 0
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/10 text-red-400",
                      )}
                    >
                      {monthKeyLabel(month.monthKey, true)}: kept{" "}
                      {formatCurrency(month.kept)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
