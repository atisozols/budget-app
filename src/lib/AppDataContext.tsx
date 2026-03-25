"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  TransactionType,
  SettingsType,
  CategoryType,
  RecurringPaymentType,
} from "@/lib/types";

interface AppData {
  loading: boolean;
  transactions: TransactionType[];
  settings: SettingsType | null;
  categories: CategoryType[];
  recurring: RecurringPaymentType[];
  year: number;
  refetchTransactions: () => Promise<void>;
  refetchSettings: () => Promise<void>;
  refetchCategories: () => Promise<void>;
  refetchRecurring: () => Promise<void>;
  refetchAll: () => Promise<void>;
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [recurring, setRecurring] = useState<RecurringPaymentType[]>([]);
  const year = new Date().getFullYear();

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(`/api/transactions?year=${year}`);
      const data = await res.json();
      setTransactions(data);
    } catch (e) {
      console.error("Failed to fetch transactions:", e);
    }
  }, [year]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error("Failed to fetch settings:", e);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data);
    } catch (e) {
      console.error("Failed to fetch categories:", e);
    }
  }, []);

  const fetchRecurring = useCallback(async () => {
    try {
      const res = await fetch("/api/recurring");
      const data = await res.json();
      setRecurring(data);
    } catch (e) {
      console.error("Failed to fetch recurring:", e);
    }
  }, []);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      fetchTransactions(),
      fetchSettings(),
      fetchCategories(),
      fetchRecurring(),
    ]);
  }, [fetchTransactions, fetchSettings, fetchCategories, fetchRecurring]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refetchAll();
      setLoading(false);
    };
    init();
  }, [refetchAll]);

  return (
    <AppDataContext.Provider
      value={{
        loading,
        transactions,
        settings,
        categories,
        recurring,
        year,
        refetchTransactions: fetchTransactions,
        refetchSettings: fetchSettings,
        refetchCategories: fetchCategories,
        refetchRecurring: fetchRecurring,
        refetchAll,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
