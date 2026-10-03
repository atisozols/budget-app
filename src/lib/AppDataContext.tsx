"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import {
  TransactionType,
  SettingsType,
  CategoryType,
  RecurringPaymentType,
} from "@/lib/types";
import { buildCategoryIndex, type CategoryIndex } from "@/lib/categories";
import { txDateKey } from "@/lib/dates";

const UNDO_WINDOW_MS = 5000;

interface PendingDelete {
  transaction: TransactionType;
  timer: ReturnType<typeof setTimeout>;
}

interface AppData {
  loading: boolean;
  /** Every transaction across all years, newest first. */
  allTransactions: TransactionType[];
  /** Current calendar year only (what the year-based home cards expect). */
  transactions: TransactionType[];
  settings: SettingsType | null;
  categories: CategoryType[];
  categoryIndex: CategoryIndex;
  recurring: RecurringPaymentType[];
  year: number;
  refetchTransactions: () => Promise<void>;
  refetchSettings: () => Promise<void>;
  refetchCategories: () => Promise<void>;
  refetchRecurring: () => Promise<void>;
  refetchAll: () => Promise<void>;
  /** Hides the transaction immediately and deletes it after the undo window. */
  deleteTransaction: (transaction: TransactionType) => void;
  undoDelete: () => void;
  lastDeleted: TransactionType | null;
}

const AppDataContext = createContext<AppData | null>(null);

function sendDelete(id: string) {
  return fetch(`/api/transactions/${id}`, {
    method: "DELETE",
    keepalive: true,
  });
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [fetchedTransactions, setFetchedTransactions] = useState<
    TransactionType[]
  >([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [recurring, setRecurring] = useState<RecurringPaymentType[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [lastDeleted, setLastDeleted] = useState<TransactionType | null>(null);
  const pendingRef = useRef(new Map<string, PendingDelete>());
  const year = new Date().getFullYear();

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setFetchedTransactions(data);
    } catch (e) {
      console.error("Failed to fetch transactions:", e);
    }
  }, []);

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
      const res = await fetch("/api/categories", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
    } catch (e) {
      console.error("Failed to fetch categories:", e);
    }
  }, []);

  const fetchRecurring = useCallback(async () => {
    try {
      const res = await fetch("/api/recurring", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setRecurring(data);
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

  // ─── Deferred delete with undo ────────────────────────────────────
  const commitDelete = useCallback(
    async (id: string) => {
      const pending = pendingRef.current.get(id);
      if (!pending) return;
      pendingRef.current.delete(id);
      try {
        await sendDelete(id);
      } catch (e) {
        console.error("Failed to delete transaction:", e);
      }
      await fetchTransactions();
      setHiddenIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setLastDeleted((current) => (current?._id === id ? null : current));
    },
    [fetchTransactions],
  );

  const deleteTransaction = useCallback(
    (transaction: TransactionType) => {
      const id = transaction._id;
      if (pendingRef.current.has(id)) return;
      const timer = setTimeout(() => commitDelete(id), UNDO_WINDOW_MS);
      pendingRef.current.set(id, { transaction, timer });
      setHiddenIds((current) => new Set(current).add(id));
      setLastDeleted(transaction);
    },
    [commitDelete],
  );

  const undoDelete = useCallback(() => {
    if (!lastDeleted) return;
    const pending = pendingRef.current.get(lastDeleted._id);
    if (pending) {
      clearTimeout(pending.timer);
      pendingRef.current.delete(lastDeleted._id);
    }
    setHiddenIds((current) => {
      const next = new Set(current);
      next.delete(lastDeleted._id);
      return next;
    });
    setLastDeleted(null);
  }, [lastDeleted]);

  // Leaving the app inside the undo window still completes the delete.
  useEffect(() => {
    const pending = pendingRef.current;
    const flush = () => {
      for (const [id, entry] of pending) {
        clearTimeout(entry.timer);
        sendDelete(id).catch(() => undefined);
      }
      pending.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const allTransactions = useMemo(
    () =>
      hiddenIds.size === 0
        ? fetchedTransactions
        : fetchedTransactions.filter((t) => !hiddenIds.has(t._id)),
    [fetchedTransactions, hiddenIds],
  );

  const transactions = useMemo(() => {
    const prefix = `${year}-`;
    return allTransactions.filter((t) => txDateKey(t.date).startsWith(prefix));
  }, [allTransactions, year]);

  const categoryIndex = useMemo(
    () => buildCategoryIndex(categories),
    [categories],
  );

  return (
    <AppDataContext.Provider
      value={{
        loading,
        allTransactions,
        transactions,
        settings,
        categories,
        categoryIndex,
        recurring,
        year,
        refetchTransactions: fetchTransactions,
        refetchSettings: fetchSettings,
        refetchCategories: fetchCategories,
        refetchRecurring: fetchRecurring,
        refetchAll,
        deleteTransaction,
        undoDelete,
        lastDeleted,
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
