import type { HomeCardPreference } from "@/lib/homeCards";

export interface CategoryType {
  _id: string;
  name: string;
  emoji: string;
  color: string;
  type: "expense" | "income";
  budgetType: BudgetType;
  isDefault: boolean;
  parentId?: string | null;
  isTax?: boolean;
}

export interface TransactionType {
  _id: string;
  amount: number;
  type: "expense" | "income";
  categoryId: CategoryType;
  description: string;
  date: string;
  tags: string[];
  incomeType?: "bruto" | "neto";
  isWriteOff: boolean;
  recurringPaymentId?: string;
  debtPayment?: "tax" | "credit";
  taxYear?: number;
  createdAt: string;
}

export interface RecurringPaymentType {
  _id: string;
  name: string;
  amount: number;
  categoryId: CategoryType;
  frequency: "monthly" | "quarterly" | "yearly";
  dueDay: number;
  isActive: boolean;
  budgetType: BudgetType;
  isWriteOff: boolean;
  startDate?: string;
}

export interface SettingsType {
  _id: string;
  currentBalance: number;
  balanceDate: string;
  taxDebt: number;
  taxDebtDate: string;
  creditDebt: number;
  creditDebtDate: string;
  incomeTags: string[];
  vsaoiRate: number;
  vsaoiPensionRate: number;
  vsaoiThreshold: number;
  iinRate: number;
  homeCards: HomeCardPreference[];
  savingsGoal: number;
  savingsStartMonth?: string;
  budgets: BudgetEntry[];
  quickPicks: QuickPick[];
}

/** A pinned shortcut in the add-transaction sheet. */
export interface QuickPick {
  categoryId: string;
  description?: string;
  isWriteOff?: boolean;
  incomeType?: "bruto" | "neto";
}

export interface BudgetEntry {
  categoryId: string;
  amount: number;
}

// "obligations" covers money that isn't lifestyle spending (taxes, debt
// repayment). "savings" is kept for categories created before savings became
// a goal instead of a transaction.
export type BudgetType = "needs" | "wants" | "savings" | "obligations";
export type IncomeType = "bruto" | "neto";
