import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function calculateTax(brutoProfit: number, iinRate: number = 25.5) {
  const iinTax = brutoProfit * (iinRate / 100);
  return { iinTax, afterTax: brutoProfit - iinTax };
}

export function calculateVSAOI(brutoIncome: number, vsaoiRate: number = 31.07) {
  return brutoIncome * (vsaoiRate / 100);
}

export function calculateSelfEmployedTaxes(
  brutoIncome: number,
  writeOffExpenses: number,
  iinRate: number = 25.5,
  vsaoiRate: number = 31.07,
) {
  const profit = brutoIncome - writeOffExpenses;
  const vsaoi = calculateVSAOI(profit > 0 ? profit : 0, vsaoiRate);
  const taxableIncome = profit - vsaoi;
  const iinTax = taxableIncome > 0 ? taxableIncome * (iinRate / 100) : 0;
  const totalTax = vsaoi + iinTax;
  const netIncome = profit - totalTax;

  return {
    brutoIncome,
    writeOffExpenses,
    profit,
    vsaoi,
    taxableIncome: taxableIncome > 0 ? taxableIncome : 0,
    iinTax,
    totalTax,
    netIncome,
  };
}

export function getHealthScore(params: {
  balance: number;
  totalDebt: number;
  needsRatio: number;
  wantsRatio: number;
  savingsRatio: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}): { score: number; label: string; color: string } {
  let score = 50;

  // Debt-to-income ratio impact (-30 to +10)
  if (params.monthlyIncome > 0) {
    const dti = params.totalDebt / (params.monthlyIncome * 12);
    if (dti === 0) score += 10;
    else if (dti < 0.2) score += 5;
    else if (dti < 0.5) score -= 5;
    else if (dti < 1) score -= 15;
    else score -= 30;
  }

  // Balance impact (-20 to +15)
  if (params.balance > params.monthlyExpenses * 3) score += 15;
  else if (params.balance > params.monthlyExpenses) score += 5;
  else if (params.balance > 0) score -= 5;
  else score -= 20;

  // 50/30/20 adherence (-15 to +15)
  const needsDiff = Math.abs(params.needsRatio - 50);
  const wantsDiff = Math.abs(params.wantsRatio - 30);
  const savingsDiff = Math.abs(params.savingsRatio - 20);
  const avgDiff = (needsDiff + wantsDiff + savingsDiff) / 3;
  if (avgDiff < 5) score += 15;
  else if (avgDiff < 10) score += 10;
  else if (avgDiff < 20) score += 0;
  else score -= 15;

  // Income vs expenses (+10 to -10)
  if (params.monthlyIncome > 0) {
    const ratio = params.monthlyExpenses / params.monthlyIncome;
    if (ratio < 0.7) score += 10;
    else if (ratio < 0.9) score += 5;
    else if (ratio < 1) score -= 0;
    else score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  let label: string;
  let color: string;
  if (score >= 80) {
    label = "Excellent";
    color = "#22c55e";
  } else if (score >= 60) {
    label = "Good";
    color = "#84cc16";
  } else if (score >= 40) {
    label = "Fair";
    color = "#eab308";
  } else if (score >= 20) {
    label = "Needs Work";
    color = "#f97316";
  } else {
    label = "Critical";
    color = "#ef4444";
  }

  return { score, label, color };
}

export const BUDGET_TYPE_COLORS = {
  needs: "#6366f1",
  wants: "#f59e0b",
  savings: "#22c55e",
};

export const BUDGET_TYPE_LABELS = {
  needs: "Needs (50%)",
  wants: "Wants (30%)",
  savings: "Savings & Investments (20%)",
};

export const DEFAULT_CATEGORIES = [
  {
    name: "Rent",
    emoji: "🏠",
    color: "#6366f1",
    type: "expense" as const,
    budgetType: "needs" as const,
  },
  {
    name: "Groceries",
    emoji: "🛒",
    color: "#22c55e",
    type: "expense" as const,
    budgetType: "needs" as const,
  },
  {
    name: "Car Sharing",
    emoji: "🚗",
    color: "#3b82f6",
    type: "expense" as const,
    budgetType: "needs" as const,
  },
  {
    name: "Mobilly",
    emoji: "🅿️",
    color: "#2563eb",
    type: "expense" as const,
    budgetType: "needs" as const,
  },
  {
    name: "Gas",
    emoji: "⛽",
    color: "#0ea5e9",
    type: "expense" as const,
    budgetType: "needs" as const,
  },
  {
    name: "Utilities",
    emoji: "💡",
    color: "#8b5cf6",
    type: "expense" as const,
    budgetType: "needs" as const,
  },
  {
    name: "Insurance",
    emoji: "🛡️",
    color: "#0ea5e9",
    type: "expense" as const,
    budgetType: "needs" as const,
  },
  {
    name: "Phone & Internet",
    emoji: "📱",
    color: "#06b6d4",
    type: "expense" as const,
    budgetType: "needs" as const,
  },
  {
    name: "Dining Out",
    emoji: "🍽️",
    color: "#f59e0b",
    type: "expense" as const,
    budgetType: "wants" as const,
  },
  {
    name: "Entertainment",
    emoji: "🎬",
    color: "#ec4899",
    type: "expense" as const,
    budgetType: "wants" as const,
  },
  {
    name: "Shopping",
    emoji: "🛍️",
    color: "#f97316",
    type: "expense" as const,
    budgetType: "wants" as const,
  },
  {
    name: "Subscriptions",
    emoji: "📺",
    color: "#a855f7",
    type: "expense" as const,
    budgetType: "wants" as const,
  },
  {
    name: "Health",
    emoji: "💊",
    color: "#14b8a6",
    type: "expense" as const,
    budgetType: "needs" as const,
  },
  {
    name: "Education",
    emoji: "📚",
    color: "#84cc16",
    type: "expense" as const,
    budgetType: "savings" as const,
  },
  {
    name: "Savings",
    emoji: "💰",
    color: "#22c55e",
    type: "expense" as const,
    budgetType: "savings" as const,
  },
  {
    name: "Investments",
    emoji: "📈",
    color: "#10b981",
    type: "expense" as const,
    budgetType: "savings" as const,
  },
  {
    name: "Freelance",
    emoji: "💻",
    color: "#6366f1",
    type: "income" as const,
    budgetType: "needs" as const,
  },
  {
    name: "Salary",
    emoji: "💼",
    color: "#22c55e",
    type: "income" as const,
    budgetType: "needs" as const,
  },
  {
    name: "Contract Work",
    emoji: "📝",
    color: "#3b82f6",
    type: "income" as const,
    budgetType: "needs" as const,
  },
  {
    name: "Other Income",
    emoji: "💵",
    color: "#f59e0b",
    type: "income" as const,
    budgetType: "needs" as const,
  }, // budgetType on income is ignored — only used for expenses
];
