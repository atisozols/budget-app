"use client";

import { ArrowDown, ArrowUp, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { WeeklyDigest } from "@/lib/insights";

export default function WeeklyDigestCard({
  digest,
}: {
  digest: WeeklyDigest;
}) {
  const isUp = digest.pctChange !== null && digest.pctChange > 0;
  const maxDay = Math.max(...digest.days.map((d) => d.spend), 1);

  return (
    <div className="p-4 bg-card rounded-2xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Weekly Digest
            </span>
          </div>
          <div className="text-2xl font-bold mt-1">
            {formatCurrency(digest.total)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            ~{formatCurrency(digest.avgPerDay)}/day · non-recurring
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {digest.pctChange !== null && (
            <div
              className={`flex items-center gap-1 text-xs font-medium ${
                isUp ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {isUp ? (
                <ArrowUp className="w-3 h-3" />
              ) : (
                <ArrowDown className="w-3 h-3" />
              )}
              {Math.abs(digest.pctChange).toFixed(0)}% vs prior week
            </div>
          )}
          <div className="flex items-end gap-[2px] h-6">
            {digest.days.map((day, i) => (
              <div
                key={i}
                className="w-[6px] rounded-sm bg-primary/60"
                style={{
                  height: `${day.spend > 0 ? (day.spend / maxDay) * 100 : 8}%`,
                  opacity: day.spend > 0 ? 1 : 0.25,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Best Day</span>
          {digest.bestDay ? (
            <div className="font-medium text-emerald-400">
              {format(digest.bestDay.date, "EEE")}{" "}
              <span className="text-foreground">
                {formatCurrency(digest.bestDay.spend)}
              </span>
            </div>
          ) : (
            <div className="font-medium text-muted-foreground">—</div>
          )}
        </div>
        <div>
          <span className="text-muted-foreground">Worst Day</span>
          {digest.worstDay ? (
            <div className="font-medium text-red-400">
              {format(digest.worstDay.date, "EEE")}{" "}
              <span className="text-foreground">
                {formatCurrency(digest.worstDay.spend)}
              </span>
            </div>
          ) : (
            <div className="font-medium text-muted-foreground">—</div>
          )}
        </div>
        <div>
          <span className="text-muted-foreground">Top Category</span>
          {digest.topCategory ? (
            <div className="font-medium truncate">
              {digest.topCategory.emoji} {digest.topCategory.name}{" "}
              <span className="text-muted-foreground">
                {digest.topCategory.share.toFixed(0)}%
              </span>
            </div>
          ) : (
            <div className="font-medium text-muted-foreground">—</div>
          )}
        </div>
      </div>
    </div>
  );
}
