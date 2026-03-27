"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { TransactionType } from "@/lib/types";
import { isSpendWidgetExpense } from "@/lib/spendInsights";

const CELL = 7;
const GAP = 3;

type CellData = {
  isGood: boolean;
  isToday: boolean;
  spend: number;
  avg: number;
} | null;

interface ActivityGridProps {
  transactions: TransactionType[];
  year: number;
}

export default function ActivityGrid({
  transactions,
  year,
}: ActivityGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numCols, setNumCols] = useState(0);

  // Measure container width and compute how many columns fit
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const cols = Math.floor((w + GAP) / (CELL + GAP));
      setNumCols(cols);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const realCells = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const jan1 = new Date(year, 0, 1);
    const endDate =
      year === now.getFullYear() ? today : new Date(year, 11, 31);

    // Build daily spend map
    const dailySpend = new Map<string, number>();
    for (const t of transactions) {
      if (!isSpendWidgetExpense(t)) continue;
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dailySpend.set(key, (dailySpend.get(key) || 0) + t.amount);
    }

    const cells: CellData[] = [];
    let totalSpend = 0;
    let dayCount = 0;

    const d = new Date(jan1);
    while (d <= endDate) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const spend = dailySpend.get(key) || 0;
      const avg = dayCount > 0 ? totalSpend / dayCount : 0;
      const isGood = dayCount > 0 && spend < avg;
      const isToday = d.getTime() === today.getTime();

      cells.push({ isGood, isToday, spend, avg });

      totalSpend += spend;
      dayCount++;
      d.setDate(d.getDate() + 1);
    }

    return cells;
  }, [transactions, year]);

  // Build grid: fill real cells, pad with nulls to fill numCols * 7, slice to fit
  const columns = useMemo(() => {
    if (numCols === 0) return [];
    const totalSlots = numCols * 7;
    const all: CellData[] = [...realCells];
    while (all.length < totalSlots) all.push(null);
    const final =
      all.length > totalSlots ? all.slice(all.length - totalSlots) : all;

    const cols: CellData[][] = [];
    for (let c = 0; c < numCols; c++) {
      cols.push(final.slice(c * 7, c * 7 + 7));
    }
    return cols;
  }, [realCells, numCols]);

  return (
    <div className="p-4 bg-card rounded-2xl">
      <div className="mb-3">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Below-average spend days
        </div>
      </div>

      {/* Grid: fills full width */}
      <div ref={containerRef} style={{ display: "flex", gap: GAP }}>
        {columns.map((col, ci) => (
          <div
            key={ci}
            style={{ display: "flex", flexDirection: "column", gap: GAP }}
          >
            {col.map((cell, ri) => {
              const isToday = cell?.isToday ?? false;
              let bg: string;
              let shadow = "none";
              if (!cell) {
                bg = "rgba(34,197,94,0.08)";
              } else if (cell.isGood) {
                bg = "#22c55e";
                shadow = "0 0 4px 1px rgba(34,197,94,0.2)";
              } else {
                bg = "rgba(34,197,94,0.18)";
              }
              return (
                <div
                  key={ri}
                  style={{
                    width: CELL,
                    height: CELL,
                    backgroundColor: bg,
                    borderRadius: "50%",
                    boxShadow: shadow,
                    outline: isToday ? "1.5px solid #fff" : "none",
                    outlineOffset: 0.5,
                  }}
                  title={
                    cell
                      ? `€${cell.spend.toFixed(0)} (avg €${cell.avg.toFixed(0)})`
                      : ""
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
