"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMonth } from "@/lib/MonthContext";

export default function MonthSwitcher() {
  const { isCurrentMonth, goMonth, goToNow, label } = useMonth();

  return (
    <div className="mb-4 flex items-center justify-between">
      <button
        type="button"
        onClick={() => goMonth(-1)}
        aria-label="Previous month"
        className="rounded-xl bg-secondary p-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" onClick={goToNow} className="text-sm font-semibold">
        {label}
        {isCurrentMonth && (
          <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
            (now)
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => goMonth(1)}
        disabled={isCurrentMonth}
        aria-label="Next month"
        className="rounded-xl bg-secondary p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
