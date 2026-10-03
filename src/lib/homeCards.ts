export type HomeCardId =
  | "spendable"
  | "budgets"
  | "balance-overview"
  | "daily-spend"
  | "month-forecast"
  | "category-trends"
  | "balance-chart"
  | "activity-grid"
  | "health-score";

export interface HomeCardPreference {
  id: HomeCardId;
  enabled: boolean;
}

export interface HomeCardDefinition {
  id: HomeCardId;
  title: string;
  description: string;
  defaultEnabled: boolean;
}

export const HOME_CARD_DEFINITIONS: HomeCardDefinition[] = [
  {
    id: "spendable",
    title: "Left to Spend",
    description: "What's left this month after tax, bills and your savings goal",
    defaultEnabled: true,
  },
  {
    id: "daily-spend",
    title: "Today · One-off",
    description: "Today vs your allowance, the last 14 days, and a 6-month streak map",
    defaultEnabled: true,
  },
  {
    id: "budgets",
    title: "Budgets",
    description: "Category budgets and how this month is pacing",
    defaultEnabled: true,
  },
  {
    id: "balance-overview",
    title: "Balance & Debts",
    description: "Account balance minus tax still to pay and credit debt",
    defaultEnabled: true,
  },
  {
    id: "month-forecast",
    title: "Month Forecast",
    description: "Projected month-end spend at current pace vs last month",
    defaultEnabled: true,
  },
  {
    id: "category-trends",
    title: "Category Trends",
    description: "Biggest category changes vs the same days last month",
    defaultEnabled: true,
  },
  {
    id: "balance-chart",
    title: "Balance Chart",
    description: "Running balance over the year",
    defaultEnabled: false,
  },
  {
    id: "activity-grid",
    title: "Activity Grid",
    description: "Below-average spend days, GitHub style",
    defaultEnabled: false,
  },
  {
    id: "health-score",
    title: "Financial Health",
    description: "Composite score from income, spending, savings and debt",
    defaultEnabled: false,
  },
];

export const DEFAULT_HOME_CARDS: HomeCardPreference[] =
  HOME_CARD_DEFINITIONS.map(({ id, defaultEnabled }) => ({
    id,
    enabled: defaultEnabled,
  }));

export function normalizeHomeCards(value: unknown): HomeCardPreference[] {
  const validIds = new Set(HOME_CARD_DEFINITIONS.map((card) => card.id));
  const source = Array.isArray(value) ? value : [];

  // Layouts saved before the Spendable redesign start over from the new
  // defaults instead of mixing old and new cards.
  const hasNewLayout = source.some(
    (item) =>
      item && typeof item === "object" && (item as { id?: unknown }).id === "spendable",
  );
  if (!hasNewLayout) return DEFAULT_HOME_CARDS.map((card) => ({ ...card }));

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
      normalized.push({ ...fallback });
    }
  }

  return normalized;
}
