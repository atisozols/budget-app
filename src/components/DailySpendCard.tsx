"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Flame, X } from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import type { TransactionType } from "@/lib/types";
import { recentSpendDays, type RecentDay } from "@/lib/spendInsights";
import { MONTH_SHORT, logicalToday } from "@/lib/dates";

const BAR_DAYS = 14;
const TYPICAL_DAYS = 90;
const GRID_WEEKS = 26;
const CHART_HEIGHT = 96;
const BAR_GAP = 1.4; // % of chart width

interface Day extends RecentDay {
  /** Average daily spend over the 90 days before this day. */
  typical: number;
  underTypical: boolean;
}

/**
 * Everyday one-off spending (no bills, tax or debt): the last two weeks as
 * bars, and half a year as a GitHub-style map. A day counts as "on track"
 * when it stays at or under what was typical at the time; the streak and the
 * dots use the same rule. Today is measured against today's allowance.
 */
export default function DailySpendCard({
  transactions,
  allowance,
}: {
  transactions: TransactionType[];
  allowance: number | null;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const { days, grid, monthLabels, typical, streak, last7, prev7 } =
    useMemo(() => {
      // Monday-first week; the grid ends with the current week.
      const todayIndexInWeek = (logicalToday().getDay() + 6) % 7;
      const gridDays = (GRID_WEEKS - 1) * 7 + todayIndexInWeek + 1;
      const raw = recentSpendDays(transactions, gridDays + TYPICAL_DAYS);

      // Trailing 90-day average before each day (prefix sums).
      const prefix = [0];
      for (const d of raw) prefix.push(prefix[prefix.length - 1] + d.spend);
      const withTypical: Day[] = raw.map((d, i) => {
        const from = Math.max(0, i - TYPICAL_DAYS);
        const count = i - from;
        const typical = count > 0 ? (prefix[i] - prefix[from]) / count : 0;
        return { ...d, typical, underTypical: count > 0 && d.spend <= typical };
      });

      const days = withTypical.slice(-gridDays);
      const today = days[days.length - 1];

      let streak = 0;
      for (let i = days.length - 2; i >= 0; i--) {
        if (!days[i].underTypical) break;
        streak++;
      }

      // Columns of 7 (Mon → Sun), padded at the end of the current week.
      const cells: (Day | null)[] = [...days];
      while (cells.length % 7 !== 0) cells.push(null);
      const grid: (Day | null)[][] = [];
      for (let i = 0; i < cells.length; i += 7) grid.push(cells.slice(i, i + 7));

      const monthLabels = grid.map((week, i) => {
        const first = week[0];
        if (!first) return "";
        const previous = grid[i - 1]?.[0];
        return !previous || previous.date.getMonth() !== first.date.getMonth()
          ? MONTH_SHORT[first.date.getMonth()]
          : "";
      });

      const last7 = days.slice(-7).reduce((s, d) => s + d.spend, 0);
      const prev7 = days.slice(-14, -7).reduce((s, d) => s + d.spend, 0);
      return {
        days,
        grid,
        monthLabels,
        typical: today.typical,
        streak,
        last7,
        prev7,
      };
    }, [transactions]);

  const today = days[days.length - 1];
  const bars = days.slice(-BAR_DAYS);
  const todayTarget = allowance && allowance > 0 ? allowance : typical;
  const maxSpend = Math.max(
    ...bars.map((b) => Math.max(b.spend, b.typical)),
    1,
  );
  const underTarget = today.spend <= todayTarget;

  // Bar gaps in % of chart width. Percent margins let the typical line be
  // drawn as one path that lines up with the bars.
  const gaps: number[] = bars.map((_, i) => (i === 0 ? 0 : BAR_GAP));
  const barWidth = (100 - gaps.reduce((s, g) => s + g, 0)) / bars.length;
  const typicalPath = (() => {
    let x = 0;
    const parts: string[] = [];
    bars.forEach((bar, i) => {
      const y = 100 - (bar.typical / maxSpend) * 100;
      const left = i === 0 ? 0 : x + gaps[i] / 2;
      x += gaps[i] + barWidth;
      const right = i === bars.length - 1 ? 100 : x + gaps[i + 1] / 2;
      parts.push(i === 0 ? `M${left},${y}` : `V${y}`, `H${right}`);
    });
    return parts.join(" ");
  })();
  const change = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : null;
  const selectedDay = selectedKey
    ? (days.find((d) => d.dateKey === selectedKey) ?? null)
    : null;
  const toggle = (key: string) =>
    setSelectedKey((current) => (current === key ? null : key));
  const onTrackDays = days.filter((d) => !d.isToday && d.underTypical).length;

  return (
    <div className="rounded-2xl bg-card p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Today · one-off
          </div>
          <div
            className={cn(
              "text-2xl font-bold tabular-nums",
              underTarget ? "text-foreground" : "text-amber-400",
            )}
          >
            {formatCurrency(today.spend)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {allowance && allowance > 0
              ? `of ${formatCurrency(allowance)} allowed today`
              : `typical day ${formatCurrency(typical)}`}
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div className="flex items-center justify-end gap-1 text-xs font-medium">
            <Flame
              className={cn(
                "h-3.5 w-3.5",
                streak > 0 ? "text-orange-400" : "text-muted-foreground",
              )}
            />
            {streak}-day streak
          </div>
          <div className="text-[11px] text-muted-foreground">
            7 days {formatCurrency(last7)}
            {change !== null ? (
              <span
                className={cn(
                  "ml-1 inline-flex items-center",
                  change <= 0 ? "text-emerald-400" : "text-red-400",
                )}
              >
                {change <= 0 ? (
                  <ArrowDown className="h-3 w-3" />
                ) : (
                  <ArrowUp className="h-3 w-3" />
                )}
                {Math.abs(change).toFixed(0)}%
              </span>
            ) : null}
          </div>
          <div className="text-[11px] text-muted-foreground">
            typical {formatCurrency(typical)}/day
          </div>
        </div>
      </div>

      {/* Last 14 days: amounts sit in the bars; the dashed segment behind
          each bar is that day's typical (it drifts slowly, day to day). */}
      <div className="relative mt-4 flex items-end" style={{ height: CHART_HEIGHT }}>
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-muted-foreground/40"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={typicalPath}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {bars.map((bar, i) => {
          // Empty days get a small stub so they still read as a bar.
          const heightPct =
            bar.spend > 0
              ? Math.max((bar.spend / maxSpend) * 100, 4)
              : (4 / CHART_HEIGHT) * 100;
          const barPx = (heightPct / 100) * CHART_HEIGHT;
          const over = bar.isToday ? bar.spend > todayTarget : !bar.underTypical;
          const label =
            bar.spend > 0
              ? bar.spend >= 1000
                ? `${(bar.spend / 1000).toFixed(1)}k`
                : String(Math.round(bar.spend))
              : "";
          const labelInside = barPx >= 16;
          const gap = gaps[i];
          return (
            <button
              key={bar.dateKey}
              type="button"
              onClick={() => toggle(bar.dateKey)}
              aria-label={`${format(bar.date, "EEE MMM d")}: ${formatCurrency(bar.spend)}`}
              className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              style={{ marginLeft: `${gap}%` }}
            >
              {label && !labelInside ? (
                <span className="mb-0.5 text-[8px] leading-none text-muted-foreground tabular-nums">
                  {label}
                </span>
              ) : null}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ duration: 0.4, delay: i * 0.02 }}
                className={cn(
                  "relative flex w-full justify-center rounded-[3px]",
                  bar.spend === 0
                    ? "bg-muted-foreground/25"
                    : over
                      ? "bg-amber-500/85"
                      : "bg-primary",
                  bar.isToday && "opacity-60",
                  selectedKey === bar.dateKey &&
                    "ring-1 ring-inset ring-foreground/70",
                )}
              >
                {label && labelInside ? (
                  <span className="pt-1 text-[8px] font-medium leading-none text-white/80 tabular-nums">
                    {label}
                  </span>
                ) : null}
              </motion.div>
            </button>
          );
        })}
      </div>

      {/* Half-year streak map */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between text-[10px] text-muted-foreground">
          <span className="uppercase tracking-wider">Last 6 months</span>
          <span>
            {onTrackDays} of {days.length - 1} days on track
          </span>
        </div>
        <div
          className="mb-1 grid gap-[3px] text-[8px] leading-none text-muted-foreground"
          style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }}
        >
          {monthLabels.map((label, i) => (
            <span key={i} className="overflow-visible whitespace-nowrap">
              {label}
            </span>
          ))}
        </div>
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }}
        >
          {grid.map((week, wi) => (
            <div key={wi} className="grid gap-[3px]">
              {week.map((day, di) =>
                day ? (
                  <button
                    key={day.dateKey}
                    type="button"
                    onClick={() => toggle(day.dateKey)}
                    aria-label={`${format(day.date, "MMM d")}: ${formatCurrency(day.spend)}`}
                    className={cn(
                      "aspect-square w-full rounded-full transition-transform",
                      day.isToday
                        ? "bg-transparent ring-1 ring-inset ring-foreground/70"
                        : day.underTypical
                          ? "bg-emerald-500 shadow-[0_0_4px_rgba(34,197,94,0.25)]"
                          : "bg-emerald-500/20",
                      selectedKey === day.dateKey && "scale-125 ring-1 ring-foreground",
                    )}
                  />
                ) : (
                  <span key={`empty-${di}`} className="aspect-square w-full" />
                ),
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-end gap-3 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> at or under
            typical
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500/20" /> over
          </span>
        </div>
      </div>

      {/* Selected day */}
      <AnimatePresence initial={false}>
        {selectedDay ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {format(selectedDay.date, "EEEE, MMM d")} ·{" "}
                  {formatCurrency(selectedDay.spend)}
                  <span className="text-muted-foreground/60">
                    {" "}
                    (typical then {formatCurrency(selectedDay.typical)})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedKey(null)}
                  aria-label="Close day"
                  className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {selectedDay.transactions.length === 0 ? (
                <div className="py-2 text-center text-xs text-muted-foreground">
                  Nothing spent
                </div>
              ) : (
                selectedDay.transactions.map((tx) => (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span>{tx.categoryId?.emoji ?? "📦"}</span>
                      <span className="truncate">
                        {tx.description || tx.categoryId?.name}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-red-400">
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
