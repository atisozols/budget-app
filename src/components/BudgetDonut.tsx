"use client";

import { motion } from "framer-motion";
import { BUDGET_TYPE_COLORS, BUDGET_TYPE_LABELS } from "@/lib/utils";

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
  const total = needs + wants + savings;
  const needsPct = total > 0 ? (needs / total) * 100 : 0;
  const wantsPct = total > 0 ? (wants / total) * 100 : 0;
  const savingsPct = total > 0 ? (savings / total) * 100 : 0;

  const targetNeeds = totalIncome * 0.5;
  const targetWants = totalIncome * 0.3;
  const targetSavings = totalIncome * 0.2;

  const circumference = 2 * Math.PI * 40;

  const segments = [
    {
      key: "needs",
      pct: needsPct,
      color: BUDGET_TYPE_COLORS.needs,
      offset: 0,
    },
    {
      key: "wants",
      pct: wantsPct,
      color: BUDGET_TYPE_COLORS.wants,
      offset: needsPct,
    },
    {
      key: "savings",
      pct: savingsPct,
      color: BUDGET_TYPE_COLORS.savings,
      offset: needsPct + wantsPct,
    },
  ];

  const formatEur = (n: number) =>
    `€${n.toFixed(0)}`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="var(--secondary)"
            strokeWidth="12"
          />
          {segments.map((seg) => (
            <motion.circle
              key={seg.key}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeLinecap="butt"
              strokeDasharray={`${(seg.pct / 100) * circumference} ${circumference}`}
              initial={{ strokeDashoffset: circumference }}
              animate={{
                strokeDashoffset: -((seg.offset / 100) * circumference),
              }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Spent</span>
          <span className="text-lg font-bold">{formatEur(total)}</span>
        </div>
      </div>

      <div className="w-full space-y-2">
        {(
          [
            {
              key: "needs" as const,
              actual: needs,
              target: targetNeeds,
              pct: needsPct,
            },
            {
              key: "wants" as const,
              actual: wants,
              target: targetWants,
              pct: wantsPct,
            },
            {
              key: "savings" as const,
              actual: savings,
              target: targetSavings,
              pct: savingsPct,
            },
          ] as const
        ).map((item) => (
          <div key={item.key} className="flex items-center gap-3 text-sm">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: BUDGET_TYPE_COLORS[item.key] }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <span className="text-muted-foreground truncate">
                  {BUDGET_TYPE_LABELS[item.key]}
                </span>
                <span className="font-medium">{item.pct.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatEur(item.actual)} spent</span>
                <span>{formatEur(item.target)} target</span>
              </div>
              <div className="mt-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: BUDGET_TYPE_COLORS[item.key] }}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${item.target > 0 ? Math.min((item.actual / item.target) * 100, 100) : 0}%`,
                  }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
