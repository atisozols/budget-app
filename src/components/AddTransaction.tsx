"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, FileText, Calendar } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { IncomeType } from "@/lib/types";
import { useAppData } from "@/lib/AppDataContext";
import AmountInput from "@/components/AmountInput";

interface AddTransactionProps {
  onSuccess?: () => void;
}

export default function AddTransaction({ onSuccess }: AddTransactionProps) {
  const { categories, settings, transactions } = useAppData();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState("");
  const [isWriteOff, setIsWriteOff] = useState(false);
  const [debtPayment, setDebtPayment] = useState<"tax" | "credit" | "">("");
  const [incomeType, setIncomeType] = useState<IncomeType>("neto");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const availableTags = settings?.incomeTags || [];

  // Sort categories by usage frequency (most used first)
  const filteredCategories = useMemo(() => {
    const freq = new Map<string, number>();
    for (const t of transactions) {
      if (t.type === type) {
        const id = t.categoryId?._id;
        if (id) freq.set(id, (freq.get(id) || 0) + 1);
      }
    }
    return categories
      .filter((c) => c.type === type)
      .sort((a, b) => (freq.get(b._id) || 0) - (freq.get(a._id) || 0));
  }, [categories, transactions, type]);

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
      if (type === "income") body.incomeType = incomeType;
      if (type === "expense" && debtPayment) body.debtPayment = debtPayment;

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
          setDebtPayment("");
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

  const dateShortcuts = [
    { label: "Today", offset: 0 },
    { label: "Yesterday", offset: -1 },
    { label: "2d ago", offset: -2 },
  ];

  const openDatePicker = () => {
    const input = document.createElement("input");
    input.type = "date";
    input.value = date;
    input.style.cssText = "position:fixed;opacity:0;top:50%;left:50%";
    document.body.appendChild(input);
    const cleanup = () => {
      try {
        input.remove();
      } catch {
        /* */
      }
    };
    input.addEventListener("change", (e) => {
      setDate((e.target as HTMLInputElement).value);
      cleanup();
    });
    input.addEventListener("blur", cleanup);
    input.showPicker?.();
    input.focus();
  };

  return (
    <div className="space-y-4 pb-2">
      {/* Amount — large centered */}
      <div className="flex items-center justify-center py-3">
        <span className="text-2xl text-muted-foreground/50 mr-1">€</span>
        <AmountInput
          value={amount}
          onChange={setAmount}
          className="text-4xl font-bold text-center w-44"
          autoFocus
        />
      </div>

      {/* Type toggle — below amount */}
      <div className="flex gap-1.5 p-1 bg-secondary/50 rounded-xl">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setType(t);
              setCategoryId("");
            }}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all",
              type === t
                ? t === "expense"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-emerald-500/20 text-emerald-400"
                : "text-muted-foreground",
            )}
          >
            {t === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      {/* Category row — horizontal scroll, sorted by frequency */}
      <div className="-mx-4">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 px-4">
          Category
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
          {filteredCategories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setCategoryId(cat._id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all shrink-0",
                categoryId === cat._id
                  ? "ring-1.5 ring-primary bg-primary/10"
                  : "bg-secondary/60",
              )}
            >
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                style={{ backgroundColor: cat.color + "20" }}
              >
                {cat.emoji}
              </span>
              <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Description — inline */}
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add note..."
        className="w-full px-3 py-2.5 bg-secondary/50 rounded-xl text-sm outline-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary/30 transition-all"
      />

      {/* Date — quick picks + calendar */}
      <div className="flex gap-1.5">
        {dateShortcuts.map((d) => {
          const dt = new Date();
          dt.setDate(dt.getDate() + d.offset);
          const val = dt.toISOString().split("T")[0];
          return (
            <button
              key={d.label}
              type="button"
              onClick={() => setDate(val)}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all",
                date === val
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "bg-secondary/50 text-muted-foreground",
              )}
            >
              {d.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={openDatePicker}
          className={cn(
            "px-3 py-2 rounded-xl transition-all flex items-center gap-1.5",
            !dateShortcuts.some((d) => {
              const dt = new Date();
              dt.setDate(dt.getDate() + d.offset);
              return dt.toISOString().split("T")[0] === date;
            })
              ? "bg-primary/15 text-primary ring-1 ring-primary/30"
              : "bg-secondary/50 text-muted-foreground",
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            {!dateShortcuts.some((d) => {
              const dt = new Date();
              dt.setDate(dt.getDate() + d.offset);
              return dt.toISOString().split("T")[0] === date;
            })
              ? new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })
              : "Pick"}
          </span>
        </button>
      </div>

      {/* Expense options — compact row */}
      <AnimatePresence mode="wait">
        {type === "expense" && (
          <motion.div
            key="expense-opts"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 overflow-hidden"
          >
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Payment type
            </div>
            <div className="flex gap-1.5">
              {(["", "tax", "credit"] as const).map((dp) => (
                <button
                  key={dp}
                  type="button"
                  onClick={() => setDebtPayment(dp)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all",
                    debtPayment === dp
                      ? dp === ""
                        ? "bg-secondary ring-1 ring-primary/30 text-foreground"
                        : dp === "tax"
                          ? "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30"
                          : "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30"
                      : "bg-secondary/50 text-muted-foreground",
                  )}
                >
                  {dp === "" ? "Regular" : dp === "tax" ? "Tax" : "Credit"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsWriteOff(!isWriteOff)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-xs",
                isWriteOff
                  ? "bg-amber-500/10 ring-1 ring-amber-500/30 text-amber-400"
                  : "bg-secondary/50 text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all shrink-0",
                  isWriteOff
                    ? "bg-amber-500 border-amber-500"
                    : "border-muted-foreground/40",
                )}
              >
                {isWriteOff && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Write-off</span>
            </button>
          </motion.div>
        )}

        {type === "income" && (
          <motion.div
            key="income-opts"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 overflow-hidden"
          >
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Income type
            </div>
            <div className="flex gap-1.5">
              {(["bruto", "neto"] as const).map((it) => (
                <button
                  key={it}
                  onClick={() => setIncomeType(it)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all",
                    incomeType === it
                      ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "bg-secondary/50 text-muted-foreground",
                  )}
                >
                  {it === "bruto" ? "Bruto" : "Neto"}
                </button>
              ))}
            </div>

            {availableTags.length > 0 && (
              <>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider pt-1">
                  Tags
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() =>
                        setTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag],
                        )
                      }
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all",
                        tags.includes(tag)
                          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                          : "bg-secondary/50 text-muted-foreground",
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleSubmit}
        disabled={!amount || !categoryId || saving}
        className={cn(
          "w-full py-3 rounded-xl font-semibold text-sm transition-all",
          saved
            ? "bg-emerald-500 text-white"
            : !amount || !categoryId
              ? "bg-secondary text-muted-foreground cursor-not-allowed"
              : type === "expense"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white",
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
    </div>
  );
}
