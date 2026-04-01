import type { HomeCardPreference } from "@/lib/homeCards";

export interface CategoryType {
  _id: string;
  name: string;
  emoji: string;
  color: string;
  type: "expense" | "income";
  budgetType: "needs" | "wants" | "savings";
  isDefault: boolean;
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
  budgetType: "needs" | "wants" | "savings";
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
  iinRate: number;
  homeCards: HomeCardPreference[];
}

export type BudgetType = "needs" | "wants" | "savings";
export type IncomeType = "bruto" | "neto";
