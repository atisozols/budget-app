"use client";

import { ArrowDown, ArrowUp, Sparkles, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CategoryTrend } from "@/lib/insights";

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const width = 64;
  const height = 24;
  const max = Math.max(...values, 1);
  const step = (width - 4) / (values.length - 1);
  const x = (i: number) => 2 + i * step;
  const y = (v: number) => height - 2 - (v / max) * (height - 4);
  const points = values
    .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(values[values.length - 1])}
        r="2"
        fill={color}
      />
    </svg>
  );
}

export default function CategoryTrendsCard({
  trends,
}: {
  trends: CategoryTrend[];
}) {
  if (trends.length === 0) return null;

  return (
    <div className="p-4 bg-card rounded-2xl">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Biggest Changes · vs same days last month
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {trends.map((trend) => {
          const isUp = trend.delta > 0;
          return (
            <div key={trend.categoryId} className="flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                style={{ backgroundColor: trend.color + "20" }}
              >
                {trend.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {trend.name}
                  </span>
                  {trend.pctChange === null ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary shrink-0">
                      <Sparkles className="w-2.5 h-2.5" />
                      new
                    </span>
                  ) : (
                    <span
                      className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
                        isUp
                          ? "bg-red-500/15 text-red-400"
                          : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      {isUp ? (
                        <ArrowUp className="w-2.5 h-2.5" />
                      ) : (
                        <ArrowDown className="w-2.5 h-2.5" />
                      )}
                      {Math.abs(trend.pctChange).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {formatCurrency(trend.current)}
                  <span className="text-muted-foreground/50">
                    {" "}
                    vs {formatCurrency(trend.previous)}
                  </span>
                  <span
                    className={`ml-1.5 font-medium ${
                      isUp ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {isUp ? "+" : "−"}
                    {formatCurrency(Math.abs(trend.delta))}
                  </span>
                </div>
              </div>
              <Sparkline values={trend.sparkline} color={trend.color} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
