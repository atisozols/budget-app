"use client";

import { createContext, useContext, useState, ReactNode } from "react";

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
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const isCurrentMonth =
    month === new Date().getMonth() + 1 && year === new Date().getFullYear();

  const goMonth = (dir: -1 | 1) => {
    setMonth((m) => {
      let newM = m + dir;
      if (newM < 1) {
        setYear((y) => y - 1);
        newM = 12;
      } else if (newM > 12) {
        setYear((y) => y + 1);
        newM = 1;
      }
      return newM;
    });
  };

  const goToNow = () => {
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
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
