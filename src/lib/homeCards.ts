export type HomeCardId =
  | "health-score"
  | "spend-streak"
  | "month-forecast"
  | "category-trends"
  | "weekly-digest"
  | "activity-grid"
  | "last7-spend"
  | "average-daily-spend"
  | "balance-chart"
  | "balance-overview"
  | "month-summary"
  | "monthly-income-expenses"
  | "year-summary"
  | "budget-split"
  | "category-spend";

export interface HomeCardPreference {
  id: HomeCardId;
  enabled: boolean;
}

export interface HomeCardDefinition {
  id: HomeCardId;
  title: string;
  description: string;
}

export const HOME_CARD_DEFINITIONS: HomeCardDefinition[] = [
  {
    id: "health-score",
    title: "Financial Health",
    description:
      "Composite score from income, spend trend, savings, debt, and budget",
  },
  {
    id: "spend-streak",
    title: "Spend Streak",
    description: "Today's spend, target, and below-average streaks",
  },
  {
    id: "month-forecast",
    title: "Month Forecast",
    description: "Projected month-end spend at current pace vs last month",
  },
  {
    id: "category-trends",
    title: "Category Trends",
    description: "Top 5 biggest category changes vs last month",
  },
  {
    id: "weekly-digest",
    title: "Weekly Digest",
    description: "Last 7 days summary with best/worst day and top category",
  },
  {
    id: "activity-grid",
    title: "Activity Grid",
    description: "GitHub-style daily activity overview",
  },
  {
    id: "last7-spend",
    title: "Last 7 Days",
    description: "Recent non-recurring expense bars and day breakdown",
  },
  {
    id: "average-daily-spend",
    title: "Average Daily Spend",
    description: "Year-to-date running daily spend average",
  },
  {
    id: "balance-chart",
    title: "Balance Chart",
    description: "Yearly running balance chart",
  },
  {
    id: "balance-overview",
    title: "Balance Overview",
    description: "Current balance with above or below water snapshot",
  },
  {
    id: "month-summary",
    title: "Month Summary",
    description: "Current month income, expenses, and balance",
  },
  {
    id: "monthly-income-expenses",
    title: "Monthly Income vs Expenses",
    description: "Monthly comparison chart for the year",
  },
  {
    id: "year-summary",
    title: "Year Summary",
    description: "Year income, expenses, and savings rate",
  },
  {
    id: "budget-split",
    title: "50/30/20 Budget",
    description: "Target versus actual budget buckets",
  },
  {
    id: "category-spend",
    title: "Category Spend",
    description: "Yearly spending breakdown by category",
  },
];

export const DEFAULT_HOME_CARDS: HomeCardPreference[] =
  HOME_CARD_DEFINITIONS.map(({ id }) => ({ id, enabled: true }));

export function normalizeHomeCards(value: unknown): HomeCardPreference[] {
  const validIds = new Set(HOME_CARD_DEFINITIONS.map((card) => card.id));
  const source = Array.isArray(value) ? value : [];
  const seen = new Set<HomeCardId>();
  const normalized: HomeCardPreference[] = [];

  for (const item of source) {
    if (!item || typeof item !== "object") continue;

    const record = item as { id?: unknown; enabled?: unknown };
    if (
      typeof record.id !== "string" ||
      !validIds.has(record.id as HomeCardId)
    ) {
      continue;
    }

    const id = record.id as HomeCardId;
    if (seen.has(id)) continue;

    normalized.push({
      id,
      enabled: record.enabled !== false,
    });
    seen.add(id);
  }

  for (const fallback of DEFAULT_HOME_CARDS) {
    if (!seen.has(fallback.id)) {
      normalized.push(fallback);
    }
  }

  return normalized;
}
