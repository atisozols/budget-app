"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Save,
  Download,
  Upload,
  Plus,
  X,
  Check,
  AlertTriangle,
  Tag,
  Pencil,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { SettingsType, CategoryType, BudgetType } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [currentBalance, setCurrentBalance] = useState("");
  const [taxDebt, setTaxDebt] = useState("");
  const [creditDebt, setCreditDebt] = useState("");
  const [vsaoiRate, setVsaoiRate] = useState("");
  const [iinRate, setIinRate] = useState("");
  const [incomeTags, setIncomeTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Category management state
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [showCatSection, setShowCatSection] = useState(false);
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
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([s, cats]: [SettingsType, CategoryType[]]) => {
        setSettings(s);
        setCurrentBalance((s.currentBalance ?? 0).toString());
        setTaxDebt((s.taxDebt ?? 0).toString());
        setCreditDebt((s.creditDebt ?? 0).toString());
        setVsaoiRate((s.vsaoiRate ?? 31.07).toString());
        setIinRate((s.iinRate ?? 25.5).toString());
        setIncomeTags(s.incomeTags || []);
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
        }),
      });
      if (res.ok) {
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
          Configure your financial profile
        </p>
      </div>

      {/* Balance & Debts */}
      <motion.div
        variants={itemVariants}
        className="p-4 bg-card rounded-2xl space-y-3"
      >
        <h3 className="text-sm font-medium text-muted-foreground">
          Balance & Debts
        </h3>

        <div>
          <label className="text-xs text-muted-foreground">
            Current Balance (€)
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={currentBalance}
            onChange={(e) => setCurrentBalance(e.target.value)}
            className="w-full p-2.5 bg-secondary rounded-xl text-sm outline-none mt-1"
            step="0.01"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Tax Debt (€)</label>
          <input
            type="number"
            value={taxDebt}
            onChange={(e) => setTaxDebt(e.target.value)}
            className="w-full p-2.5 bg-secondary rounded-xl text-sm outline-none mt-1"
            step="0.01"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">
            Credit Debt (€)
          </label>
          <input
            type="number"
            value={creditDebt}
            onChange={(e) => setCreditDebt(e.target.value)}
            className="w-full p-2.5 bg-secondary rounded-xl text-sm outline-none mt-1"
            step="0.01"
          />
        </div>

        <div className="p-3 bg-secondary/50 rounded-xl text-sm">
          <div className="text-xs text-muted-foreground mb-1">
            Net Position (after debts)
          </div>
          <div
            className={cn(
              "text-lg font-bold",
              (parseFloat(currentBalance) || 0) -
                (parseFloat(taxDebt) || 0) -
                (parseFloat(creditDebt) || 0) >=
                0
                ? "text-emerald-400"
                : "text-red-400",
            )}
          >
            {formatCurrency(
              (parseFloat(currentBalance) || 0) -
                (parseFloat(taxDebt) || 0) -
                (parseFloat(creditDebt) || 0),
            )}
          </div>
        </div>
      </motion.div>

      {/* Tax Rates */}
      <motion.div
        variants={itemVariants}
        className="p-4 bg-card rounded-2xl space-y-3"
      >
        <h3 className="text-sm font-medium text-muted-foreground">Tax Rates</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">
              IIN Rate (%)
            </label>
            <input
              type="number"
              value={iinRate}
              onChange={(e) => setIinRate(e.target.value)}
              className="w-full p-2.5 bg-secondary rounded-xl text-sm outline-none mt-1"
              step="0.01"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              VSAOI Rate (%)
            </label>
            <input
              type="number"
              value={vsaoiRate}
              onChange={(e) => setVsaoiRate(e.target.value)}
              className="w-full p-2.5 bg-secondary rounded-xl text-sm outline-none mt-1"
              step="0.01"
            />
          </div>
        </div>
      </motion.div>

      {/* Income Tags */}
      <motion.div
        variants={itemVariants}
        className="p-4 bg-card rounded-2xl space-y-3"
      >
        <h3 className="text-sm font-medium text-muted-foreground">
          Income Tags
        </h3>
        <p className="text-xs text-muted-foreground">
          Create tags to categorize your income sources
        </p>

        <div className="flex flex-wrap gap-2">
          {incomeTags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
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
            className="flex-1 p-2.5 bg-secondary rounded-xl text-sm outline-none"
          />
          <button
            onClick={addTag}
            disabled={!newTag.trim()}
            className="px-4 bg-primary/20 text-primary rounded-xl text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.button
        variants={itemVariants}
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
          saved
            ? "bg-emerald-500 text-white"
            : "bg-primary text-primary-foreground hover:opacity-90",
        )}
      >
        {saved ? (
          <>
            <Check className="w-4 h-4" />
            Saved
          </>
        ) : saving ? (
          "Saving..."
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Settings
          </>
        )}
      </motion.button>

      {/* Categories Section */}
      <motion.div
        variants={itemVariants}
        className="p-4 bg-card rounded-2xl space-y-3"
      >
        <button
          onClick={() => setShowCatSection(!showCatSection)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Categories ({categories.length})
            </h3>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              showCatSection && "rotate-180",
            )}
          />
        </button>

        <AnimatePresence>
          {showCatSection && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3"
            >
              {/* Filter */}
              <div className="flex gap-2">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCatFilter(t)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-medium transition-all capitalize",
                      catFilter === t
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {t} ({categories.filter((c) => c.type === t).length})
                  </button>
                ))}
              </div>

              {/* Add button */}
              <button
                onClick={() => {
                  resetCatForm();
                  setShowCatForm(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 bg-secondary rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Category
              </button>

              {/* Add/Edit Form */}
              <AnimatePresence>
                {showCatForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-secondary rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">
                          {catEditId ? "Edit Category" : "New Category"}
                        </span>
                        <button
                          onClick={resetCatForm}
                          className="text-muted-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Preview */}
                      <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                          style={{ backgroundColor: catColor + "20" }}
                        >
                          {catEmoji}
                        </span>
                        <div>
                          <div className="text-xs font-medium">
                            {catName || "Name"}
                          </div>
                          <div className="text-[10px] text-muted-foreground capitalize">
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
                        className="w-full p-2 bg-background/50 rounded-lg text-xs outline-none"
                      />

                      {/* Type */}
                      <div className="flex gap-1.5">
                        {(["expense", "income"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setCatType(t)}
                            className={cn(
                              "flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all capitalize",
                              catType === t
                                ? "bg-primary/20 text-primary"
                                : "bg-background/50 text-muted-foreground",
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      {/* Budget Type */}
                      {catType === "expense" && (
                        <div className="flex gap-1.5">
                          {(["needs", "wants", "savings"] as const).map(
                            (bt) => (
                              <button
                                key={bt}
                                onClick={() => setCatBudgetType(bt)}
                                className={cn(
                                  "flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all capitalize",
                                  catBudgetType === bt
                                    ? "bg-primary/20 text-primary"
                                    : "bg-background/50 text-muted-foreground",
                                )}
                              >
                                {bt}
                              </button>
                            ),
                          )}
                        </div>
                      )}

                      {/* Emoji */}
                      <div className="flex flex-wrap gap-1">
                        {EMOJI_OPTIONS.map((e) => (
                          <button
                            key={e}
                            onClick={() => setCatEmoji(e)}
                            className={cn(
                              "w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all",
                              catEmoji === e
                                ? "bg-primary/20 ring-1 ring-primary"
                                : "bg-background/50 hover:bg-background/80",
                            )}
                          >
                            {e}
                          </button>
                        ))}
                      </div>

                      {/* Color */}
                      <div className="flex flex-wrap gap-1">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setCatColor(c)}
                            className={cn(
                              "w-6 h-6 rounded-md transition-all flex items-center justify-center",
                              catColor === c && "ring-2 ring-white scale-110",
                            )}
                            style={{ backgroundColor: c }}
                          >
                            {catColor === c && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleCatSave}
                        disabled={!catName}
                        className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-50"
                      >
                        {catEditId ? "Save Changes" : "Create"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* List */}
              <div className="space-y-1">
                {filteredCats.map((cat) => (
                  <div
                    key={cat._id}
                    className="flex items-center gap-2.5 p-2.5 bg-secondary/50 rounded-xl"
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                      style={{ backgroundColor: cat.color + "20" }}
                    >
                      {cat.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{cat.name}</div>
                      {cat.type === "expense" && (
                        <div className="text-[10px] text-muted-foreground capitalize">
                          {cat.budgetType}
                        </div>
                      )}
                    </div>
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <button
                      onClick={() => startCatEdit(cat)}
                      className="p-1 rounded-md hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleCatDelete(cat._id)}
                      className="p-1 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Export / Import */}
      <motion.div
        variants={itemVariants}
        className="p-4 bg-card rounded-2xl space-y-3"
      >
        <h3 className="text-sm font-medium text-muted-foreground">
          Data Management
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 py-3 bg-secondary rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
          <label className="flex items-center justify-center gap-2 py-3 bg-secondary rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors cursor-pointer">
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
              "p-3 rounded-xl text-sm flex items-center gap-2",
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

        <p className="text-[10px] text-muted-foreground">
          Export creates a full backup. Import will replace all existing data.
        </p>
      </motion.div>
    </motion.div>
  );
}
