"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  ChevronDown,
  FileText,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { CategoryType, BudgetType, IncomeType } from "@/lib/types";

interface AddTransactionProps {
  onSuccess?: () => void;
}

export default function AddTransaction({ onSuccess }: AddTransactionProps) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [isWriteOff, setIsWriteOff] = useState(false);
  const [incomeType, setIncomeType] = useState<IncomeType>("neto");
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setAvailableTags(s.incomeTags || []))
      .catch(console.error);
  }, []);

  const filteredCategories = categories.filter((c) => c.type === type);
  const selectedCategory = categories.find((c) => c._id === categoryId);

  const handleSubmit = async () => {
    if (!amount || !categoryId) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        amount: parseFloat(amount),
        type,
        categoryId,
        description,
        date: new Date(date),
        isWriteOff: type === "expense" ? isWriteOff : false,
        tags: type === "income" ? tags : [],
      };

      if (type === "income") {
        body.incomeType = incomeType;
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => {
          setAmount("");
          setDescription("");
          setCategoryId("");
          setIsWriteOff(false);
          setTags([]);
          setSaved(false);
          onSuccess?.();
        }, 1200);
      }
    } catch (error) {
      console.error("Failed to save transaction:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Type Toggle */}
      <div className="flex gap-2 p-1 bg-secondary rounded-xl">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setType(t);
              setCategoryId("");
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
              type === t
                ? t === "expense"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-emerald-500/20 text-emerald-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "expense" ? (
              <ArrowDownCircle className="w-4 h-4" />
            ) : (
              <ArrowUpCircle className="w-4 h-4" />
            )}
            {t === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      {/* Amount Input */}
      <div className="text-center py-4">
        <div className="flex items-center justify-center gap-1">
          <span className="text-3xl text-muted-foreground">€</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="text-5xl font-bold bg-transparent text-center outline-none w-48 placeholder:text-muted-foreground/30"
            step="0.01"
            min="0"
            autoFocus
          />
        </div>
      </div>

      {/* Category Selector */}
      <div>
        <button
          onClick={() => setShowCategories(!showCategories)}
          className="w-full flex items-center justify-between p-3 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            {selectedCategory ? (
              <>
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: selectedCategory.color + "20" }}
                >
                  {selectedCategory.emoji}
                </span>
                <div className="text-left">
                  <div className="text-sm font-medium">
                    {selectedCategory.name}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {selectedCategory.budgetType}
                  </div>
                </div>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                Select category
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              showCategories && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-2 mt-2">
                {filteredCategories.map((cat) => (
                  <motion.button
                    key={cat._id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setCategoryId(cat._id);
                      setShowCategories(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all",
                      categoryId === cat._id
                        ? "ring-2 ring-primary bg-primary/10"
                        : "bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    <span
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: cat.color + "20" }}
                    >
                      {cat.emoji}
                    </span>
                    <span className="text-[11px] font-medium truncate w-full text-center">
                      {cat.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Income Type (only for income) */}
      {type === "income" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          <label className="text-sm font-medium text-muted-foreground">
            Income Type
          </label>
          <div className="flex gap-2">
            {(["bruto", "neto"] as const).map((it) => (
              <button
                key={it}
                onClick={() => setIncomeType(it)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                  incomeType === it
                    ? "bg-primary/20 text-primary ring-1 ring-primary/50"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {it === "bruto"
                  ? "Bruto (Self-employed)"
                  : "Neto (After tax)"}
              </button>
            ))}
          </div>

          {/* Income Tags */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() =>
                    setTags((prev) =>
                      prev.includes(tag)
                        ? prev.filter((t) => t !== tag)
                        : [...prev, tag]
                    )
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    tags.includes(tag)
                      ? "bg-primary/20 text-primary ring-1 ring-primary/50"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Write-off checkbox (only for expenses) */}
      {type === "expense" && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setIsWriteOff(!isWriteOff)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
            isWriteOff
              ? "bg-amber-500/10 ring-1 ring-amber-500/30"
              : "bg-secondary"
          )}
        >
          <div
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
              isWriteOff
                ? "bg-amber-500 border-amber-500"
                : "border-muted-foreground"
            )}
          >
            {isWriteOff && <Check className="w-3 h-3 text-white" />}
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Write off (deductible expense)</span>
          </div>
        </motion.button>
      )}

      {/* Description */}
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full p-3 bg-secondary rounded-xl text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary/50 transition-all"
      />

      {/* Date */}
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full p-3 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary/50 transition-all [color-scheme:dark]"
      />

      {/* Submit Button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleSubmit}
        disabled={!amount || !categoryId || saving}
        className={cn(
          "w-full py-3.5 rounded-xl font-semibold text-sm transition-all",
          saved
            ? "bg-emerald-500 text-white"
            : !amount || !categoryId
              ? "bg-secondary text-muted-foreground cursor-not-allowed"
              : type === "expense"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
        )}
      >
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.span
              key="saved"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Saved {formatCurrency(parseFloat(amount || "0"))}
            </motion.span>
          ) : (
            <motion.span key="save">
              {saving
                ? "Saving..."
                : `Add ${type === "expense" ? "Expense" : "Income"}`}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}
