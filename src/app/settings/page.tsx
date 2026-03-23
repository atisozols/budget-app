"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Save,
  Download,
  Upload,
  Plus,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { SettingsType } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [initialBalance, setInitialBalance] = useState("");
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

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s: SettingsType) => {
        setSettings(s);
        setInitialBalance(s.initialBalance.toString());
        setTaxDebt(s.taxDebt.toString());
        setCreditDebt(s.creditDebt.toString());
        setVsaoiRate(s.vsaoiRate.toString());
        setIinRate(s.iinRate.toString());
        setIncomeTags(s.incomeTags || []);
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
          initialBalance: parseFloat(initialBalance) || 0,
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
      <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Balance & Debts
        </h3>

        <div>
          <label className="text-xs text-muted-foreground">
            Initial Balance (€)
          </label>
          <input
            type="number"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
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
          <div className="text-xs text-muted-foreground mb-1">Net Position</div>
          <div
            className={cn(
              "text-lg font-bold",
              (parseFloat(initialBalance) || 0) -
                (parseFloat(taxDebt) || 0) -
                (parseFloat(creditDebt) || 0) >=
                0
                ? "text-emerald-400"
                : "text-red-400"
            )}
          >
            {formatCurrency(
              (parseFloat(initialBalance) || 0) -
                (parseFloat(taxDebt) || 0) -
                (parseFloat(creditDebt) || 0)
            )}
          </div>
        </div>
      </motion.div>

      {/* Tax Rates */}
      <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Tax Rates
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">IIN Rate (%)</label>
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
      <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl space-y-3">
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
            : "bg-primary text-primary-foreground hover:opacity-90"
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

      {/* Export / Import */}
      <motion.div variants={itemVariants} className="p-4 bg-card rounded-2xl space-y-3">
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
                : "bg-red-500/10 text-red-400"
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
