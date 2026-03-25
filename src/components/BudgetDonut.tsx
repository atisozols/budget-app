"use client";

import { motion } from "framer-motion";
import {
  BUDGET_TYPE_COLORS,
  BUDGET_TYPE_LABELS,
  formatCurrency,
} from "@/lib/utils";

interface BudgetDonutProps {
  needs: number;
  wants: number;
  savings: number;
  totalIncome: number;
}

export default function BudgetDonut({
  needs,
  wants,
  savings,
  totalIncome,
}: BudgetDonutProps) {
  const buckets = [
    {
      key: "needs" as const,
      actual: needs,
      target: totalIncome * 0.5,
      share: 50,
      accent: "rgba(99,102,241,0.12)",
    },
    {
      key: "wants" as const,
      actual: wants,
      target: totalIncome * 0.3,
      share: 30,
      accent: "rgba(245,158,11,0.12)",
    },
    {
      key: "savings" as const,
      actual: savings,
      target: totalIncome * 0.2,
      share: 20,
      accent: "rgba(34,197,94,0.12)",
    },
  ];

  return (
    <div className="space-y-2.5">
        {buckets.map((bucket, index) => {
          const delta = bucket.target - bucket.actual;
          const isUnderTarget = delta >= 0;
          const ratio =
            bucket.target > 0
              ? Math.min((bucket.actual / bucket.target) * 100, 100)
              : 0;

          return (
            <motion.div
              key={bucket.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.06 }}
              className="rounded-2xl border border-border/70 bg-card/60 p-3"
              style={{
                boxShadow: `inset 0 1px 0 ${bucket.accent}`,
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: BUDGET_TYPE_COLORS[bucket.key] }}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {BUDGET_TYPE_LABELS[bucket.key]}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {bucket.share}% target
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Gap
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      isUnderTarget ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {isUnderTarget ? "-" : "+"}
                    {formatCurrency(Math.abs(delta))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-secondary/50 p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Target</div>
                  <div className="mt-1 text-base font-bold">
                    {formatCurrency(bucket.target)}
                  </div>
                </div>
                <div className="rounded-xl bg-secondary/50 p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Spent</div>
                  <div className="mt-1 text-base font-bold">
                    {formatCurrency(bucket.actual)}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: BUDGET_TYPE_COLORS[bucket.key] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${ratio}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
    </div>
  );
}
