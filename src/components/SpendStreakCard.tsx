"use client";

import { Target, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface SpendStreakCardProps {
  todaySpend: number;
  targetSpend: number;
  currentStreak: number;
  bestStreak: number;
}

export default function SpendStreakCard({
  todaySpend,
  targetSpend,
  currentStreak,
  bestStreak,
}: SpendStreakCardProps) {
  const isBelowTarget = targetSpend <= 0 || todaySpend <= targetSpend;
  const gapToTarget = targetSpend - todaySpend;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isBelowTarget
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-amber-500/20 bg-amber-500/5"
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Today&apos;s Spend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Target
            className={`h-3.5 w-3.5 ${
              isBelowTarget ? "text-emerald-400" : "text-amber-400"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {isBelowTarget ? "On pace" : "Above target"}
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-3xl font-bold">{formatCurrency(todaySpend)}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Spent so far today
          </div>
        </div>

        <div className="text-right">
          <div
            className={`text-3xl font-bold ${
              isBelowTarget ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {formatCurrency(targetSpend)}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Target to stay under
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Gap</span>
          <div
            className={`font-medium ${
              gapToTarget >= 0 ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {gapToTarget >= 0 ? "+" : "-"}
            {formatCurrency(Math.abs(gapToTarget))}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Current Streak</span>
          <div className="font-medium">{currentStreak} days</div>
        </div>
        <div>
          <span className="text-muted-foreground">Best Streak</span>
          <div className="font-medium">{bestStreak} days</div>
        </div>
      </div>
    </div>
  );
}
