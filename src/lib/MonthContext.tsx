"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { logicalToday } from "@/lib/dates";

interface MonthContextType {
  month: number;
  year: number;
  isCurrentMonth: boolean;
  goMonth: (dir: -1 | 1) => void;
  goToNow: () => void;
  label: string;
}

const MonthContext = createContext<MonthContextType | null>(null);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MonthProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState(() => {
    const today = logicalToday();
    return { month: today.getMonth() + 1, year: today.getFullYear() };
  });
  const { month, year } = current;

  const today = logicalToday();
  const isCurrentMonth =
    month === today.getMonth() + 1 && year === today.getFullYear();

  const goMonth = (dir: -1 | 1) => {
    setCurrent(({ month: m, year: y }) => {
      const d = new Date(y, m - 1 + dir, 1);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    });
  };

  const goToNow = () => {
    const now = logicalToday();
    setCurrent({ month: now.getMonth() + 1, year: now.getFullYear() });
  };

  const label = `${MONTH_NAMES[month - 1]} ${year}`;

  return (
    <MonthContext.Provider
      value={{ month, year, isCurrentMonth, goMonth, goToNow, label }}
    >
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error("useMonth must be used within MonthProvider");
  return ctx;
}
