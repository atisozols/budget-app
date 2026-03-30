"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { TransactionType } from "@/lib/types";
import { buildSpendWidgetDailySeries } from "@/lib/spendInsights";

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
    return buildSpendWidgetDailySeries(transactions, year).map((day) => ({
      isGood: day.isBelowAverage,
      isToday: day.isToday,
      spend: day.spend,
      avg: day.averageBeforeSpend,
    }));
  }, [transactions, year]);

  // Build grid: fill real cells, pad with nulls to fill numCols * 7, slice to fit
  const columns = useMemo(() => {
    if (numCols === 0) return [];
    const jan1 = new Date(year, 0, 1);
    const startPad = (jan1.getDay() + 6) % 7;
    const aligned: CellData[] = [...Array(startPad).fill(null), ...realCells];

    while (aligned.length % 7 !== 0) {
      aligned.push(null);
    }

    const weekColumns: CellData[][] = [];
    for (let i = 0; i < aligned.length; i += 7) {
      weekColumns.push(aligned.slice(i, i + 7));
    }

    while (weekColumns.length < numCols) {
      weekColumns.push(Array<CellData>(7).fill(null));
    }

    return weekColumns.slice(-numCols);
  }, [realCells, numCols, year]);

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
                bg = "rgba(161,161,170,0.12)";
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
