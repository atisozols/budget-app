"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Save,
  Download,
  Upload,
  LogOut,
  Plus,
  X,
  Check,
  AlertTriangle,
  Tag,
  Pencil,
  Trash2,
  UserPlus,
  ChevronDown,
  LayoutPanelTop,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { SettingsType, CategoryType, BudgetType } from "@/lib/types";
import { format } from "date-fns";
import type { SessionUser } from "@/lib/auth";
import { useAppData } from "@/lib/AppDataContext";
import {
  HOME_CARD_DEFINITIONS,
  type HomeCardPreference,
  normalizeHomeCards,
} from "@/lib/homeCards";

type DrawerKey =
  | "home-cards"
  | "add-user"
  | "balance-debts"
  | "tax-rates"
  | "income-tags"
  | "categories";

function DrawerSection({
  title,
  subtitle,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{title}</div>
            <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/60 px-4 pb-4 pt-3">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function SettingsPage() {
  const { refetchSettings } = useAppData();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [currentBalance, setCurrentBalance] = useState("");
  const [taxDebt, setTaxDebt] = useState("");
  const [creditDebt, setCreditDebt] = useState("");
  const [vsaoiRate, setVsaoiRate] = useState("");
  const [iinRate, setIinRate] = useState("");
  const [incomeTags, setIncomeTags] = useState<string[]>([]);
  const [homeCards, setHomeCards] = useState<HomeCardPreference[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [userCreateStatus, setUserCreateStatus] = useState<string | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<DrawerKey | null>(null);

  // Category management state
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("📦");
  const [catColor, setCatColor] = useState("#6366f1");
  const [catType, setCatType] = useState<"expense" | "income">("expense");
  const [catBudgetType, setCatBudgetType] = useState<BudgetType>("needs");
  const [catFilter, setCatFilter] = useState<"expense" | "income">("expense");

  useEffect(() => {
    Promise.all([
      fetch("/api/settings", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/auth/me")
        .then(async (r) => (r.ok ? (await r.json()).user : null))
        .catch(() => null),
    ])
      .then(([s, cats, sessionUser]: [SettingsType, CategoryType[], SessionUser | null]) => {
        setSettings(s);
        setUser(sessionUser);
        setCurrentBalance((s.currentBalance ?? 0).toString());
        setTaxDebt((s.taxDebt ?? 0).toString());
        setCreditDebt((s.creditDebt ?? 0).toString());
        setVsaoiRate((s.vsaoiRate ?? 31.07).toString());
        setIinRate((s.iinRate ?? 25.5).toString());
        setIncomeTags(s.incomeTags || []);
        setHomeCards(normalizeHomeCards(s.homeCards));
        setCategories(cats);
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentBalance: parseFloat(currentBalance) || 0,
          taxDebt: parseFloat(taxDebt) || 0,
          creditDebt: parseFloat(creditDebt) || 0,
          vsaoiRate: parseFloat(vsaoiRate) || 31.07,
          iinRate: parseFloat(iinRate) || 25.5,
          incomeTags,
          homeCards,
        }),
      });
      if (res.ok) {
        const updatedSettings = (await res.json()) as SettingsType;
        setSettings(updatedSettings);
        setHomeCards(normalizeHomeCards(updatedSettings.homeCards));
        await refetchSettings();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !incomeTags.includes(newTag.trim())) {
      setIncomeTags((prev) => [...prev, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setIncomeTags((prev) => prev.filter((t) => t !== tag));
  };

  const toggleHomeCard = (id: HomeCardPreference["id"]) => {
    setHomeCards((current) =>
      current.map((card) =>
        card.id === id ? { ...card, enabled: !card.enabled } : card,
      ),
    );
  };

  const moveHomeCard = (index: number, direction: -1 | 1) => {
    setHomeCards((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  // ─── Category management ─────────────────────────────────────────
  const EMOJI_OPTIONS = [
    "🏠",
    "🛒",
    "🚗",
    "💡",
    "🛡️",
    "📱",
    "🍽️",
    "🎬",
    "🛍️",
    "📺",
    "💊",
    "📚",
    "💰",
    "📈",
    "💻",
    "💼",
    "📝",
    "💵",
    "🎮",
    "✈️",
    "🏋️",
    "☕",
    "🎵",
    "🐕",
    "👶",
    "🎁",
    "🔧",
    "🏥",
    "🚌",
    "🏦",
    "🍕",
    "🎨",
    "📷",
    "🧹",
    "💇",
    "🏪",
    "⛽",
    "🅿️",
    "📬",
    "🎓",
  ];
  const COLOR_OPTIONS = [
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#ec4899",
    "#f43f5e",
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#2563eb",
    "#4f46e5",
    "#7c3aed",
    "#9333ea",
  ];

  const resetCatForm = () => {
    setCatName("");
    setCatEmoji("📦");
    setCatColor("#6366f1");
    setCatType("expense");
    setCatBudgetType("needs");
    setCatEditId(null);
    setShowCatForm(false);
  };

  const startCatEdit = (cat: CategoryType) => {
    setCatName(cat.name);
    setCatEmoji(cat.emoji);
    setCatColor(cat.color);
    setCatType(cat.type);
    setCatBudgetType(cat.budgetType);
    setCatEditId(cat._id);
    setShowCatForm(true);
  };

  const handleCatSave = async () => {
    if (!catName) return;
    try {
      const body = {
        name: catName,
        emoji: catEmoji,
        color: catColor,
        type: catType,
        budgetType: catBudgetType,
      };
      let res;
      if (catEditId) {
        res = await fetch(`/api/categories/${catEditId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (res.ok) {
        const saved = await res.json();
        if (catEditId) {
          setCategories((prev) =>
            prev.map((c) => (c._id === catEditId ? saved : c)),
          );
        } else {
          setCategories((prev) => [...prev, saved]);
        }
        resetCatForm();
      }
    } catch (error) {
      console.error("Failed to save category:", error);
    }
  };

  const handleCatDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const filteredCats = categories.filter((c) => c.type === catFilter);
  const toggleDrawer = (drawer: DrawerKey) => {
    setActiveDrawer((current) => (current === drawer ? null : drawer));
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `budget-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setImportStatus("Data imported successfully! Refreshing...");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setImportStatus("Import failed. Check file format.");
      }
    } catch (error) {
      console.error("Import failed:", error);
      setImportStatus("Import failed. Invalid JSON file.");
    } finally {
      setImporting(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  };

  const handleCreateUser = async () => {
    setCreatingUser(true);
    setUserCreateStatus(null);

    try {
      const response = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setUserCreateStatus(data.error || "Failed to create user.");
        return;
      }

      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setUserCreateStatus(`Created ${data.user.name} successfully.`);
    } catch (error) {
      console.error("Failed to create user:", error);
      setUserCreateStatus("Failed to create user.");
    } finally {
      setCreatingUser(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const parsedBalance = parseFloat(currentBalance) || 0;
  const parsedTaxDebt = parseFloat(taxDebt) || 0;
  const parsedCreditDebt = parseFloat(creditDebt) || 0;
  const netPosition = parsedBalance - parsedTaxDebt - parsedCreditDebt;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <div>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your profile, rules, and backups
        </p>
      </div>

      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card p-4"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.1),transparent_28%)]" />
        <div className="relative space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Account
              </div>
              <div className="mt-1 text-lg font-semibold">
                {user?.name || "Budget Flow"}
              </div>
              <div className="text-xs text-muted-foreground">
                {user?.email || "Signed in"}
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
            >
              <LogOut className="w-3.5 h-3.5" />
              {loggingOut ? "Signing out..." : "Log out"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-background/60 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Net Position
              </div>
              <div
                className={cn(
                  "mt-1 text-lg font-bold",
                  netPosition >= 0 ? "text-emerald-400" : "text-red-400",
                )}
              >
                {formatCurrency(netPosition)}
              </div>
            </div>
            <div className="rounded-xl bg-background/60 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Income Tags
              </div>
              <div className="mt-1 text-lg font-bold">{incomeTags.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary/80"
            >
              <Download className="w-4 h-4" />
              Export Data
            </button>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary/80">
              <Upload className="w-4 h-4" />
              {importing ? "Importing..." : "Import Data"}
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>

          {importStatus && (
            <div
              className={cn(
                "rounded-xl p-3 text-sm flex items-center gap-2",
                importStatus.includes("success")
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400",
              )}
            >
              {importStatus.includes("success") ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {importStatus}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
        <DrawerSection
          title="Main View Cards"
          subtitle={`${homeCards.filter((card) => card.enabled).length} visible cards in your current order`}
          icon={<LayoutPanelTop className="h-4 w-4" />}
          open={activeDrawer === "home-cards"}
          onToggle={() => toggleDrawer("home-cards")}
        >
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Choose which cards appear on the home screen and move them into the
              order you prefer.
            </p>

            <div className="space-y-2">
              {homeCards.map((card, index) => {
                const definition = HOME_CARD_DEFINITIONS.find(
                  (item) => item.id === card.id,
                );
                if (!definition) return null;

                return (
                  <div
                    key={card.id}
                    className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => toggleHomeCard(card.id)}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                        card.enabled
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-background/40 text-transparent",
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{definition.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {definition.description}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => moveHomeCard(index, -1)}
                        disabled={index === 0}
                        className="rounded-lg bg-background/60 p-2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveHomeCard(index, 1)}
                        disabled={index === homeCards.length - 1}
                        className="rounded-lg bg-background/60 p-2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DrawerSection>

        <DrawerSection
          title="Add User"
          subtitle="Create another account from this signed-in session"
          icon={<UserPlus className="h-4 w-4" />}
          open={activeDrawer === "add-user"}
          onToggle={() => toggleDrawer("add-user")}
        >
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Signed-in users can create another account by setting the name, email,
              and password here.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none"
              />
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none"
              />
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Password (min 8 chars)"
                className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <button
              onClick={handleCreateUser}
              disabled={
                creatingUser ||
                !newUserName.trim() ||
                !newUserEmail.trim() ||
                !newUserPassword.trim()
              }
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {creatingUser ? "Creating user..." : "Create User"}
            </button>

            {userCreateStatus && (
              <div
                className={cn(
                  "rounded-xl p-3 text-sm",
                  userCreateStatus.startsWith("Created")
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400",
                )}
              >
                {userCreateStatus}
              </div>
            )}
          </div>
        </DrawerSection>

        <DrawerSection
          title="Balance & Debts"
          subtitle={`${formatCurrency(parsedBalance)} balance, ${formatCurrency(parsedTaxDebt + parsedCreditDebt)} debt`}
          icon={<AlertTriangle className="h-4 w-4" />}
          open={activeDrawer === "balance-debts"}
          onToggle={() => toggleDrawer("balance-debts")}
        >
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">
                  Current Balance (€)
                </label>
                {settings?.balanceDate && (
                  <span className="text-[10px] text-muted-foreground/60">
                    Set {format(new Date(settings.balanceDate), "MMM d, yyyy")}
                  </span>
                )}
              </div>
              <input
                type="number"
                inputMode="decimal"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                className="mt-1 w-full rounded-xl bg-secondary p-2.5 text-sm outline-none"
                step="0.01"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Tax Debt (€)</label>
                {settings?.taxDebtDate && (
                  <span className="text-[10px] text-muted-foreground/60">
                    Set {format(new Date(settings.taxDebtDate), "MMM d, yyyy")}
                  </span>
                )}
              </div>
              <input
                type="number"
                value={taxDebt}
                onChange={(e) => setTaxDebt(e.target.value)}
                className="mt-1 w-full rounded-xl bg-secondary p-2.5 text-sm outline-none"
                step="0.01"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">
                  Credit Debt (€)
                </label>
                {settings?.creditDebtDate && (
                  <span className="text-[10px] text-muted-foreground/60">
                    Set {format(new Date(settings.creditDebtDate), "MMM d, yyyy")}
                  </span>
                )}
              </div>
              <input
                type="number"
                value={creditDebt}
                onChange={(e) => setCreditDebt(e.target.value)}
                className="mt-1 w-full rounded-xl bg-secondary p-2.5 text-sm outline-none"
                step="0.01"
              />
            </div>

            <div className="rounded-xl bg-secondary/50 p-3 text-sm">
              <div className="mb-1 text-xs text-muted-foreground">
                Net Position (after debts)
              </div>
              <div
                className={cn(
                  "text-lg font-bold",
                  netPosition >= 0 ? "text-emerald-400" : "text-red-400",
                )}
              >
                {formatCurrency(netPosition)}
              </div>
            </div>
          </div>
        </DrawerSection>

        <DrawerSection
          title="Tax Rates"
          subtitle={`IIN ${iinRate || "0"}% · VSAOI ${vsaoiRate || "0"}%`}
          icon={<Save className="h-4 w-4" />}
          open={activeDrawer === "tax-rates"}
          onToggle={() => toggleDrawer("tax-rates")}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">IIN Rate (%)</label>
              <input
                type="number"
                value={iinRate}
                onChange={(e) => setIinRate(e.target.value)}
                className="mt-1 w-full rounded-xl bg-secondary p-2.5 text-sm outline-none"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">VSAOI Rate (%)</label>
              <input
                type="number"
                value={vsaoiRate}
                onChange={(e) => setVsaoiRate(e.target.value)}
                className="mt-1 w-full rounded-xl bg-secondary p-2.5 text-sm outline-none"
                step="0.01"
              />
            </div>
          </div>
        </DrawerSection>

        <DrawerSection
          title="Income Tags"
          subtitle={`${incomeTags.length} saved tag${incomeTags.length === 1 ? "" : "s"}`}
          icon={<Tag className="h-4 w-4" />}
          open={activeDrawer === "income-tags"}
          onToggle={() => toggleDrawer("income-tags")}
        >
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Create tags to categorize your income sources.
            </p>

            <div className="flex flex-wrap gap-2">
              {incomeTags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="transition-colors hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="New tag name"
                className="flex-1 rounded-xl bg-secondary p-2.5 text-sm outline-none"
              />
              <button
                onClick={addTag}
                disabled={!newTag.trim()}
                className="rounded-xl bg-primary/20 px-4 text-sm font-medium text-primary disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </DrawerSection>

        <DrawerSection
          title="Categories"
          subtitle={`${categories.filter((c) => c.type === "expense").length} expense · ${categories.filter((c) => c.type === "income").length} income`}
          icon={<Tag className="h-4 w-4" />}
          open={activeDrawer === "categories"}
          onToggle={() => toggleDrawer("categories")}
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setCatFilter(t)}
                  className={cn(
                    "flex-1 rounded-xl py-2 text-xs font-medium capitalize transition-all",
                    catFilter === t
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {t} ({categories.filter((c) => c.type === t).length})
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                resetCatForm();
                setShowCatForm(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Category
            </button>

            <AnimatePresence>
              {showCatForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2.5 rounded-xl bg-secondary p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {catEditId ? "Edit Category" : "New Category"}
                      </span>
                      <button onClick={resetCatForm} className="text-muted-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg bg-background/50 p-2">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
                        style={{ backgroundColor: catColor + "20" }}
                      >
                        {catEmoji}
                      </span>
                      <div>
                        <div className="text-xs font-medium">{catName || "Name"}</div>
                        <div className="text-[10px] capitalize text-muted-foreground">
                          {catType}
                          {catType === "expense" ? ` · ${catBudgetType}` : ""}
                        </div>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="Category name"
                      className="w-full rounded-lg bg-background/50 p-2 text-xs outline-none"
                    />

                    <div className="flex gap-1.5">
                      {(["expense", "income"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setCatType(t)}
                          className={cn(
                            "flex-1 rounded-lg py-1.5 text-[10px] font-medium capitalize transition-all",
                            catType === t
                              ? "bg-primary/20 text-primary"
                              : "bg-background/50 text-muted-foreground",
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {catType === "expense" && (
                      <div className="flex gap-1.5">
                        {(["needs", "wants", "savings"] as const).map((bt) => (
                          <button
                            key={bt}
                            onClick={() => setCatBudgetType(bt)}
                            className={cn(
                              "flex-1 rounded-lg py-1.5 text-[10px] font-medium capitalize transition-all",
                              catBudgetType === bt
                                ? "bg-primary/20 text-primary"
                                : "bg-background/50 text-muted-foreground",
                            )}
                          >
                            {bt}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {EMOJI_OPTIONS.map((e) => (
                        <button
                          key={e}
                          onClick={() => setCatEmoji(e)}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-md text-sm transition-all",
                            catEmoji === e
                              ? "bg-primary/20 ring-1 ring-primary"
                              : "bg-background/50 hover:bg-background/80",
                          )}
                        >
                          {e}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setCatColor(c)}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md transition-all",
                            catColor === c && "scale-110 ring-2 ring-white",
                          )}
                          style={{ backgroundColor: c }}
                        >
                          {catColor === c && <Check className="h-3 w-3 text-white" />}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleCatSave}
                      disabled={!catName}
                      className="w-full rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {catEditId ? "Save Changes" : "Create"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              {filteredCats.map((cat) => (
                <div
                  key={cat._id}
                  className="flex items-center gap-2.5 rounded-xl bg-secondary/50 p-2.5"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                    style={{ backgroundColor: cat.color + "20" }}
                  >
                    {cat.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium">{cat.name}</div>
                    {cat.type === "expense" && (
                      <div className="text-[10px] capitalize text-muted-foreground">
                        {cat.budgetType}
                      </div>
                    )}
                  </div>
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <button
                    onClick={() => startCatEdit(cat)}
                    className="rounded-md p-1 text-muted-foreground transition-all hover:bg-primary/20 hover:text-primary"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleCatDelete(cat._id)}
                    className="rounded-md p-1 text-muted-foreground transition-all hover:bg-destructive/20 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </DrawerSection>
      </motion.div>

      <motion.button
        variants={itemVariants}
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all",
          saved
            ? "bg-emerald-500 text-white"
            : "bg-primary text-primary-foreground hover:opacity-90",
        )}
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" />
            Saved
          </>
        ) : saving ? (
          "Saving..."
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Settings
          </>
        )}
      </motion.button>

      <motion.p
        variants={itemVariants}
        className="px-1 text-[10px] text-muted-foreground"
      >
        Export creates a full backup. Import replaces the current account&apos;s
        data with the uploaded file.
      </motion.p>
    </motion.div>
  );
}
