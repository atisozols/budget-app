"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, CalendarClock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MonthForecast } from "@/lib/insights";

export default function MonthForecastCard({
  forecast,
}: {
  forecast: MonthForecast;
}) {
  const isHigher =
    forecast.pctVsLastMonth !== null && forecast.pctVsLastMonth > 0;
  const spentPct =
    forecast.projectedTotal > 0
      ? Math.min((forecast.spentSoFar / forecast.projectedTotal) * 100, 100)
      : 0;
  const monthPct = (forecast.daysElapsed / forecast.daysInMonth) * 100;

  return (
    <div className="p-4 bg-card rounded-2xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Projected Month-End Spend
            </span>
          </div>
          <div className="text-2xl font-bold mt-1">
            {formatCurrency(forecast.projectedTotal)}
          </div>
        </div>
        {forecast.pctVsLastMonth !== null && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              isHigher ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {isHigher ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
            {Math.abs(forecast.pctVsLastMonth).toFixed(0)}% vs last month
          </div>
        )}
      </div>

      <div className="mt-3 relative h-2 bg-secondary rounded-full overflow-visible">
        <motion.div
          className={`h-full rounded-full ${
            isHigher ? "bg-red-400/70" : "bg-emerald-500/70"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${spentPct}%` }}
          transition={{ duration: 0.6 }}
        />
        <div
          className="absolute top-[-3px] bottom-[-3px] w-px bg-muted-foreground/60"
          style={{ left: `${monthPct}%` }}
          title="Month progress"
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground/60">
        <span>spent {formatCurrency(forecast.spentSoFar)}</span>
        <span>
          day {forecast.daysElapsed}/{forecast.daysInMonth}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Daily Pace</span>
          <div className="font-medium">
            {formatCurrency(forecast.variablePacePerDay)}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Bills Unpaid</span>
          <div className="font-medium">
            {formatCurrency(forecast.unpaidRecurringTotal)}
            {forecast.unpaidRecurringCount > 0 && (
              <span className="text-muted-foreground/60">
                {" "}
                ({forecast.unpaidRecurringCount})
              </span>
            )}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Last Month</span>
          <div className="font-medium">
            {formatCurrency(forecast.lastMonthTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}
