"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Check, ChevronLeft, Delete, FileText } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { IncomeType } from "@/lib/types";
import { useAppData } from "@/lib/AppDataContext";

interface AddTransactionProps {
  initialType?: "expense" | "income";
  onSuccess?: () => void;
}

type ComposerStep = "amount" | "details";

function amountFromDigits(digits: string) {
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toFixed(2);
}

function digitsFromAmount(value: string) {
  return value.replace(/[^0-9]/g, "");
}

const keypadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

export default function AddTransaction({
  initialType = "expense",
  onSuccess,
}: AddTransactionProps) {
  const { categories, settings, transactions } = useAppData();
  const [type] = useState<"expense" | "income">(initialType);
  const [step, setStep] = useState<ComposerStep>("amount");
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

  const filteredCategories = useMemo(() => {
    const freq = new Map<string, number>();
    for (const transaction of transactions) {
      if (transaction.type === type) {
        const id = transaction.categoryId?._id;
        if (id) {
          freq.set(id, (freq.get(id) || 0) + 1);
        }
      }
    }

    return categories
      .filter((category) => category.type === type)
      .sort((a, b) => (freq.get(b._id) || 0) - (freq.get(a._id) || 0));
  }, [categories, transactions, type]);

  const dateShortcuts = [
    { label: "Today", offset: 0 },
    { label: "Yesterday", offset: -1 },
    { label: "2d ago", offset: -2 },
  ];

  const appendDigit = (digit: string) => {
    const nextDigits = `${digitsFromAmount(amount)}${digit}`.replace(/^0+/, "");
    setAmount(amountFromDigits(nextDigits));
  };

  const deleteDigit = () => {
    const nextDigits = digitsFromAmount(amount).slice(0, -1);
    setAmount(amountFromDigits(nextDigits));
  };

  const clearAmount = () => {
    setAmount("");
  };

  const resetForm = () => {
    setStep("amount");
    setAmount("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setCategoryId("");
    setIsWriteOff(false);
    setDebtPayment("");
    setIncomeType("neto");
    setTags([]);
    setSaved(false);
  };

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

      if (type === "expense" && debtPayment) {
        body.debtPayment = debtPayment;
      }

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
            return;
          }

          resetForm();
        }, 900);
      }
    } catch (error) {
      console.error("Failed to save transaction:", error);
    } finally {
      setSaving(false);
    }
  };

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
        /* noop */
      }
    };

    input.addEventListener("change", (event) => {
      setDate((event.target as HTMLInputElement).value);
      cleanup();
    });
    input.addEventListener("blur", cleanup);
    input.showPicker?.();
    input.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {step === "amount" ? (
          <motion.div
            key="amount-step"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.24 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex flex-1 flex-col justify-between gap-4 pb-4">
              <div
                className={cn(
                  "rounded-[28px] border px-4 py-5",
                  type === "expense"
                    ? "border-red-500/15 bg-red-500/5"
                    : "border-emerald-500/15 bg-emerald-500/5",
                )}
              >
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {type === "expense" ? "New expense" : "New income"}
                </div>
                <div className="mt-3 flex items-end justify-center gap-2">
                  <span className="pb-1.5 text-xl text-muted-foreground/50">€</span>
                  <div className="min-w-0 text-center text-5xl font-bold tabular-nums tracking-tight sm:text-6xl">
                    {amount ? parseFloat(amount).toFixed(2) : "0.00"}
                  </div>
                </div>
                <div className="mt-2 text-center text-sm text-muted-foreground">
                  Enter the amount first, then we&apos;ll add the details.
                </div>
              </div>

              <div className="mt-auto">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep("details")}
                  disabled={!amount}
                  className={cn(
                    "mb-3 w-full rounded-2xl py-3 font-semibold text-sm transition-all",
                    !amount
                      ? "cursor-not-allowed bg-secondary text-muted-foreground"
                      : type === "expense"
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-emerald-500 text-white hover:bg-emerald-600",
                  )}
                >
                  Continue
                </motion.button>

                <div className="grid grid-cols-3 gap-2">
                  {keypadKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (key === "C") {
                          clearAmount();
                          return;
                        }
                        if (key === "⌫") {
                          deleteDigit();
                          return;
                        }
                        appendDigit(key);
                      }}
                      className={cn(
                        "flex h-12 items-center justify-center rounded-2xl border border-border/60 bg-card text-lg font-semibold transition-colors active:scale-[0.98] sm:h-14",
                        key === "C" && "text-muted-foreground",
                      )}
                    >
                      {key === "⌫" ? <Delete className="h-5 w-5" /> : key}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details-step"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.24 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex items-center gap-2 pb-3">
              <button
                type="button"
                onClick={() => setStep("amount")}
                className="rounded-xl bg-secondary/50 p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Details
                </div>
                <div className="truncate text-sm font-medium">
                  {type === "expense" ? "Finish your expense" : "Finish your income"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep("amount")}
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm font-semibold tabular-nums",
                  type === "expense"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-emerald-500/10 text-emerald-400",
                )}
              >
                {formatCurrency(parseFloat(amount || "0"))}
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-between gap-4">
              <div className="space-y-3 overflow-y-auto pb-3">
                <div className="min-w-0">
                  <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Category
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {filteredCategories.map((category) => (
                      <button
                        key={category._id}
                        type="button"
                        onClick={() => setCategoryId(category._id)}
                        className={cn(
                          "shrink-0 rounded-2xl px-2.5 py-2 transition-all",
                          categoryId === category._id
                            ? "bg-primary/10 ring-1.5 ring-primary"
                            : "bg-secondary/60",
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-base"
                            style={{ backgroundColor: category.color + "20" }}
                          >
                            {category.emoji}
                          </span>
                          <span className="whitespace-nowrap text-[9px] font-medium text-muted-foreground">
                            {category.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={
                    type === "expense"
                      ? "What was this for?"
                      : "Where did this come from?"
                  }
                  className="w-full rounded-2xl bg-secondary/50 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary/30 transition-all"
                />

                <div className="flex min-w-0 gap-1.5">
                  {dateShortcuts.map((shortcut) => {
                    const shortcutDate = new Date();
                    shortcutDate.setDate(shortcutDate.getDate() + shortcut.offset);
                    const value = shortcutDate.toISOString().split("T")[0];

                    return (
                      <button
                        key={shortcut.label}
                        type="button"
                        onClick={() => setDate(value)}
                        className={cn(
                          "min-w-0 flex-1 rounded-xl py-2 text-[9px] font-semibold uppercase tracking-[0.16em] transition-all",
                          date === value
                            ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                            : "bg-secondary/50 text-muted-foreground",
                        )}
                      >
                        {shortcut.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={openDatePicker}
                    className={cn(
                      "min-w-0 shrink-0 rounded-xl px-3 py-2 transition-all flex items-center gap-1.5",
                      !dateShortcuts.some((shortcut) => {
                        const shortcutDate = new Date();
                        shortcutDate.setDate(shortcutDate.getDate() + shortcut.offset);
                        return shortcutDate.toISOString().split("T")[0] === date;
                      })
                        ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                        : "bg-secondary/50 text-muted-foreground",
                    )}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      {!dateShortcuts.some((shortcut) => {
                        const shortcutDate = new Date();
                        shortcutDate.setDate(shortcutDate.getDate() + shortcut.offset);
                        return shortcutDate.toISOString().split("T")[0] === date;
                      })
                        ? new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })
                        : "Pick"}
                    </span>
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {type === "expense" ? (
                    <motion.div
                      key="expense-options"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Payment type
                      </div>
                      <div className="flex min-w-0 gap-1.5">
                        {(["", "tax", "credit"] as const).map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setDebtPayment(value)}
                            className={cn(
                              "min-w-0 flex-1 rounded-xl py-2 text-[9px] font-semibold uppercase tracking-[0.16em] transition-all",
                              debtPayment === value
                                ? value === ""
                                  ? "bg-secondary text-foreground ring-1 ring-primary/30"
                                  : value === "tax"
                                    ? "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30"
                                    : "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30"
                                : "bg-secondary/50 text-muted-foreground",
                            )}
                          >
                            {value === "" ? "Regular" : value === "tax" ? "Tax" : "Credit"}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsWriteOff(!isWriteOff)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs transition-all",
                          isWriteOff
                            ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30"
                            : "bg-secondary/50 text-muted-foreground",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px] transition-all",
                            isWriteOff
                              ? "border-amber-500 bg-amber-500"
                              : "border-muted-foreground/40",
                          )}
                        >
                          {isWriteOff ? <Check className="h-2.5 w-2.5 text-white" /> : null}
                        </div>
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span>Write-off</span>
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="income-options"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Income type
                      </div>
                      <div className="flex min-w-0 gap-1.5">
                        {(["bruto", "neto"] as const).map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setIncomeType(value)}
                            className={cn(
                              "min-w-0 flex-1 rounded-xl py-2 text-[9px] font-semibold uppercase tracking-[0.16em] transition-all",
                              incomeType === value
                                ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                                : "bg-secondary/50 text-muted-foreground",
                            )}
                          >
                            {value === "bruto" ? "Bruto" : "Neto"}
                          </button>
                        ))}
                      </div>

                      {availableTags.length > 0 ? (
                        <>
                          <div className="pt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            Tags
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {availableTags.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() =>
                                  setTags((current) =>
                                    current.includes(tag)
                                      ? current.filter((item) => item !== tag)
                                      : [...current, tag],
                                  )
                                }
                                className={cn(
                                  "rounded-lg px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all",
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
                      ) : null}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="-mx-4 mt-2 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={!categoryId || saving || saved}
                  className={cn(
                    "w-full rounded-2xl py-3 font-semibold text-sm transition-all",
                    saved
                      ? "bg-emerald-500 text-white"
                      : !categoryId
                        ? "cursor-not-allowed bg-secondary text-muted-foreground"
                        : type === "expense"
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-emerald-500 text-white hover:bg-emerald-600",
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
                        <Check className="h-4 w-4" />
                        Saved {formatCurrency(parseFloat(amount || "0"))}
                      </motion.span>
                    ) : (
                      <motion.span key="submit">
                        {saving
                          ? "Saving..."
                          : `Add ${type === "expense" ? "Expense" : "Income"}`}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
