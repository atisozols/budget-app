"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMonth } from "@/lib/MonthContext";

const MONTH_PAGES = ["/", "/dashboard", "/recurring", "/history"];

export default function MonthSwitcher() {
  const { isCurrentMonth, goMonth, goToNow, label } = useMonth();
  const pathname = usePathname();

  if (!MONTH_PAGES.includes(pathname)) return null;

  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={() => goMonth(-1)}
        className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button onClick={goToNow} className="text-sm font-semibold">
        {label}
        {isCurrentMonth && (
          <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
            (now)
          </span>
        )}
      </button>
      <button
        onClick={() => goMonth(1)}
        disabled={isCurrentMonth}
        className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
