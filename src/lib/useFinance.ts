"use client";

import { useMemo } from "react";
import { useAppData } from "@/lib/AppDataContext";
import { computeSpendable } from "@/lib/spendable";
import { computeTaxYear, taxRatesFrom } from "@/lib/tax";
import {
  type CategoryIndex,
  isDebtRepayment,
} from "@/lib/categories";
import type { SettingsType, TransactionType } from "@/lib/types";

export function useTaxRates() {
  const { settings } = useAppData();
  return useMemo(() => taxRatesFrom(settings), [settings]);
}

export function useSpendable() {
  const { allTransactions, recurring, settings, categoryIndex } = useAppData();
  const rates = useTaxRates();
  return useMemo(
    () =>
      computeSpendable({
        transactions: allTransactions,
        recurring,
        settings,
        index: categoryIndex,
        rates,
      }),
    [allTransactions, recurring, settings, categoryIndex, rates],
  );
}

export function useTaxYear(year: number) {
  const { allTransactions, categoryIndex } = useAppData();
  const rates = useTaxRates();
  return useMemo(
    () => computeTaxYear(allTransactions, year, categoryIndex, rates),
    [allTransactions, categoryIndex, rates, year],
  );
}

/**
 * Credit debt: the amount set in Settings, minus repayments logged after it
 * was set (by when they were entered, so back-dated entries still count).
 */
export function creditDebtOutstanding(
  settings: SettingsType | null,
  transactions: TransactionType[],
  index: CategoryIndex,
) {
  const base = settings?.creditDebt ?? 0;
  if (base <= 0) return { base: 0, repaid: 0, outstanding: 0 };
  const since = settings?.creditDebtDate
    ? new Date(settings.creditDebtDate).getTime()
    : 0;
  const repaid = transactions
    .filter(
      (t) =>
        isDebtRepayment(t, index) &&
        new Date(t.createdAt ?? t.date).getTime() > since,
    )
    .reduce((s, t) => s + t.amount, 0);
  return { base, repaid, outstanding: Math.max(0, base - repaid) };
}

export function useCreditDebt() {
  const { settings, allTransactions, categoryIndex } = useAppData();
  return useMemo(
    () => creditDebtOutstanding(settings, allTransactions, categoryIndex),
    [settings, allTransactions, categoryIndex],
  );
}
