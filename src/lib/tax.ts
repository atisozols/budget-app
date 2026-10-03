import type { SettingsType, TransactionType } from "@/lib/types";
import { type CategoryIndex, isTaxPayment } from "@/lib/categories";
import { txDateKey } from "@/lib/dates";

// Latvian self-employed tax on bruto income, worked out per month:
//
//   profit  = bruto income − write-offs (that month)
//   VSAOI   = profit ≥ threshold
//               ? full rate × threshold + pension rate × (profit − threshold)
//               : pension rate × profit
//   IIN     = IIN rate × (year-to-date profit − year-to-date VSAOI)
//
// IIN is annual, so it's computed cumulatively: a month's IIN is the growth
// in year-to-date IIN, which lets a loss month release tax set aside earlier.

export interface TaxRates {
  vsaoiRate: number;
  vsaoiPensionRate: number;
  vsaoiThreshold: number;
  iinRate: number;
}

export function taxRatesFrom(settings: SettingsType | null): TaxRates {
  return {
    vsaoiRate: settings?.vsaoiRate ?? 31.07,
    vsaoiPensionRate: settings?.vsaoiPensionRate ?? 10,
    vsaoiThreshold: settings?.vsaoiThreshold ?? 780,
    iinRate: settings?.iinRate ?? 25.5,
  };
}

export function monthlyVsaoi(profit: number, rates: TaxRates) {
  if (profit <= 0) return 0;
  const full = rates.vsaoiRate / 100;
  const pension = rates.vsaoiPensionRate / 100;
  if (profit >= rates.vsaoiThreshold) {
    return (
      full * rates.vsaoiThreshold + pension * (profit - rates.vsaoiThreshold)
    );
  }
  return pension * profit;
}

export function isBrutoIncome(t: TransactionType) {
  return t.type === "income" && t.incomeType === "bruto";
}

/** Write-offs that reduce taxable profit (tax payments never do). */
export function isDeductibleWriteOff(t: TransactionType, index: CategoryIndex) {
  return t.type === "expense" && t.isWriteOff && !isTaxPayment(t, index);
}

/** Which year's tax a payment settles. */
export function taxYearOf(t: TransactionType) {
  return t.taxYear ?? Number(txDateKey(t.date).slice(0, 4));
}

export interface TaxMonth {
  month: number; // 0-11
  bruto: number;
  writeOffs: number;
  profit: number;
  vsaoi: number;
  iin: number;
  total: number;
}

export interface TaxYearSummary {
  year: number;
  months: TaxMonth[];
  bruto: number;
  writeOffs: number;
  profit: number;
  vsaoi: number;
  iin: number;
  owed: number;
  payments: TransactionType[];
  paid: number;
  outstanding: number;
  brutoIncomes: TransactionType[];
  writeOffItems: TransactionType[];
}

export function computeTaxYear(
  transactions: TransactionType[],
  year: number,
  index: CategoryIndex,
  rates: TaxRates,
): TaxYearSummary {
  const months: TaxMonth[] = Array.from({ length: 12 }, (_, month) => ({
    month,
    bruto: 0,
    writeOffs: 0,
    profit: 0,
    vsaoi: 0,
    iin: 0,
    total: 0,
  }));
  const payments: TransactionType[] = [];
  const brutoIncomes: TransactionType[] = [];
  const writeOffItems: TransactionType[] = [];
  const prefix = `${year}-`;

  for (const t of transactions) {
    if (isTaxPayment(t, index) && taxYearOf(t) === year) payments.push(t);

    const key = txDateKey(t.date);
    if (!key.startsWith(prefix)) continue;
    const month = Number(key.slice(5, 7)) - 1;

    if (isBrutoIncome(t)) {
      months[month].bruto += t.amount;
      brutoIncomes.push(t);
    } else if (isDeductibleWriteOff(t, index)) {
      months[month].writeOffs += t.amount;
      writeOffItems.push(t);
    }
  }

  const iinRate = rates.iinRate / 100;
  let cumulativeProfit = 0;
  let cumulativeVsaoi = 0;
  let cumulativeIin = 0;
  for (const m of months) {
    const net = m.bruto - m.writeOffs;
    m.profit = Math.max(0, net);
    m.vsaoi = monthlyVsaoi(m.profit, rates);
    cumulativeProfit += net;
    cumulativeVsaoi += m.vsaoi;
    const iinToDate = iinRate * Math.max(0, cumulativeProfit - cumulativeVsaoi);
    m.iin = iinToDate - cumulativeIin;
    cumulativeIin = iinToDate;
    m.total = m.vsaoi + m.iin;
  }

  const sum = (key: keyof TaxMonth) =>
    months.reduce((s, m) => s + (m[key] as number), 0);
  const vsaoi = sum("vsaoi");
  const iin = cumulativeIin;
  const owed = vsaoi + iin;
  const paid = payments.reduce((s, t) => s + t.amount, 0);

  return {
    year,
    months,
    bruto: sum("bruto"),
    writeOffs: sum("writeOffs"),
    profit: Math.max(0, cumulativeProfit),
    vsaoi,
    iin,
    owed,
    payments,
    paid,
    outstanding: owed - paid,
    brutoIncomes,
    writeOffItems,
  };
}

/** Tax to set aside for one calendar month ("YYYY-MM"). */
export function taxReserveForMonth(
  transactions: TransactionType[],
  monthKey: string,
  index: CategoryIndex,
  rates: TaxRates,
) {
  const [y, m] = monthKey.split("-").map(Number);
  const summary = computeTaxYear(transactions, y, index, rates);
  return summary.months[m - 1];
}

/** Share of a month's tax that belongs to one bruto income. */
export function taxShareOfIncome(t: TransactionType, month: TaxMonth) {
  if (!isBrutoIncome(t) || month.bruto <= 0) return 0;
  return (t.amount / month.bruto) * month.total;
}
