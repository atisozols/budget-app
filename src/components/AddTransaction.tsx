"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Check, ChevronLeft, Delete, FileText, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { IncomeType } from "@/lib/types";
import { useAppData } from "@/lib/AppDataContext";
import CategoryPicker from "@/components/CategoryPicker";
import { FieldLabel, Pill, Segmented, Switch } from "@/components/ui";
import { categoryLabel } from "@/lib/categories";
import {
  dateKeyToDate,
  logicalTodayKey,
  shiftDateKey,
  txDateKey,
} from "@/lib/dates";

interface AddTransactionProps {
  initialType?: "expense" | "income";
  onSuccess?: () => void;
}

type ComposerStep = "amount" | "details";

interface QuickPickOption {
  key: string;
  categoryId: string;
  description: string;
  isWriteOff: boolean;
  incomeType?: IncomeType;
  pinned: boolean;
}

interface Remembered {
  text: string;
  count: number;
  categoryId: string;
  lastKey: string;
  isWriteOff: boolean;
  incomeType?: IncomeType;
}

function amountFromDigits(digits: string) {
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toFixed(2);
}

function digitsFromAmount(value: string) {
  return value.replace(/[^0-9]/g, "");
}

const keypadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

function openNativeDatePicker(value: string, onPick: (value: string) => void) {
  const input = document.createElement("input");
  input.type = "date";
  input.value = value;
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
    onPick((event.target as HTMLInputElement).value);
    cleanup();
  });
  input.addEventListener("blur", cleanup);
  input.showPicker?.();
  input.focus();
}

export default function AddTransaction({
  initialType = "expense",
  onSuccess,
}: AddTransactionProps) {
  const { settings, allTransactions, categoryIndex } = useAppData();
  const [type] = useState<"expense" | "income">(initialType);
  const [step, setStep] = useState<ComposerStep>("amount");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => logicalTodayKey());
  const [categoryId, setCategoryId] = useState("");
  const [isWriteOff, setIsWriteOff] = useState(false);
  const [taxYear, setTaxYear] = useState<number | null>(null);
  const [incomeType, setIncomeType] = useState<IncomeType>("neto");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExpense = type === "expense";
  const availableTags = settings?.incomeTags || [];
  const selectedCategory = categoryId
    ? categoryIndex.byId.get(categoryId)
    : undefined;
  const isTaxCategory = Boolean(selectedCategory?.isTax);
  const dateYear = Number(date.slice(0, 4));
  const effectiveTaxYear = taxYear ?? dateYear;
  const numericAmount = parseFloat(amount || "0");

  // Past descriptions → how they were logged last time.
  const memory = useMemo(() => {
    const map = new Map<string, Remembered>();
    for (const t of allTransactions) {
      if (t.type !== type) continue;
      const text = t.description?.trim();
      if (!text || !t.categoryId?._id) continue;
      const normalized = text.toLowerCase();
      const key = txDateKey(t.date);
      const entry = map.get(normalized);
      if (!entry || key > entry.lastKey) {
        map.set(normalized, {
          text,
          count: (entry?.count ?? 0) + 1,
          categoryId: t.categoryId._id,
          lastKey: key,
          isWriteOff: t.isWriteOff,
          incomeType: t.incomeType,
        });
      } else {
        entry.count++;
      }
    }
    return map;
  }, [allTransactions, type]);

  // Quick picks: pinned ones from Settings first, then the combinations you
  // log most (category + description + write-off/income type), including
  // entries without a description.
  const quickPicks = useMemo(() => {
    const picks: QuickPickOption[] = [];
    const seen = new Set<string>();
    const keyOf = (categoryId: string, description?: string) =>
      `${categoryId}|${(description ?? "").trim().toLowerCase()}`;

    for (const pin of settings?.quickPicks ?? []) {
      const category = categoryIndex.byId.get(String(pin.categoryId));
      if (!category || category.type !== type) continue;
      const key = keyOf(category._id, pin.description);
      if (seen.has(key)) continue;
      seen.add(key);
      picks.push({
        key,
        categoryId: category._id,
        description: pin.description ?? "",
        isWriteOff: Boolean(pin.isWriteOff),
        incomeType: pin.incomeType,
        pinned: true,
      });
    }

    const cutoff = shiftDateKey(logicalTodayKey(), -90);
    const combos = new Map<string, QuickPickOption & { count: number }>();
    for (const t of allTransactions) {
      if (t.type !== type || !t.categoryId?._id) continue;
      if (txDateKey(t.date) < cutoff) continue;
      if (!categoryIndex.byId.has(t.categoryId._id)) continue;
      const description = t.description?.trim() ?? "";
      const key = keyOf(t.categoryId._id, description);
      const combo = combos.get(key);
      if (combo) {
        combo.count++;
      } else {
        combos.set(key, {
          key,
          categoryId: t.categoryId._id,
          description,
          isWriteOff: t.isWriteOff,
          incomeType: t.incomeType,
          pinned: false,
          count: 1,
        });
      }
    }
    for (const combo of [...combos.values()].sort((a, b) => b.count - a.count)) {
      if (picks.length >= 10) break;
      if (combo.count < 3 || seen.has(combo.key)) continue;
      seen.add(combo.key);
      picks.push(combo);
    }
    return picks;
  }, [settings, allTransactions, categoryIndex, type]);

  const suggestions = useMemo(() => {
    const query = description.trim().toLowerCase();
    if (!query) return [];
    return [...memory.entries()]
      .filter(
        ([normalized, entry]) =>
          normalized !== query &&
          normalized.includes(query) &&
          categoryIndex.byId.has(entry.categoryId),
      )
      .sort(([aKey, a], [bKey, b]) => {
        const aStarts = aKey.startsWith(query) ? 1 : 0;
        const bStarts = bKey.startsWith(query) ? 1 : 0;
        return bStarts - aStarts || b.count - a.count;
      })
      .slice(0, 4)
      .map(([, entry]) => entry);
  }, [description, memory, categoryIndex]);

  const applyRemembered = (entry: Remembered) => {
    setDescription(entry.text);
    setCategoryId(entry.categoryId);
    if (isExpense) setIsWriteOff(entry.isWriteOff);
    else if (entry.incomeType) setIncomeType(entry.incomeType);
  };

  const applyPick = (pick: QuickPickOption) => {
    setCategoryId(pick.categoryId);
    setDescription(pick.description);
    if (isExpense) setIsWriteOff(pick.isWriteOff);
    else if (pick.incomeType) setIncomeType(pick.incomeType);
  };

  const pickedQuick = quickPicks.find(
    (pick) =>
      pick.categoryId === categoryId &&
      pick.description.toLowerCase() === description.trim().toLowerCase() &&
      (!isExpense || pick.isWriteOff === isWriteOff),
  );

  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    if (categoryId) return;
    const match = memory.get(text.trim().toLowerCase());
    if (match && categoryIndex.byId.has(match.categoryId)) {
      applyRemembered({ ...match, text });
    }
  };

  const todayKey = logicalTodayKey();
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const dateMode =
    date === todayKey ? "today" : date === yesterdayKey ? "yesterday" : "other";

  const appendDigit = (digit: string) => {
    const nextDigits = `${digitsFromAmount(amount)}${digit}`.replace(/^0+/, "");
    if (nextDigits.length > 9) return;
    setAmount(amountFromDigits(nextDigits));
  };

  const handleSubmit = async () => {
    if (!amount || !categoryId) return;

    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        amount: numericAmount,
        type,
        categoryId,
        description: description.trim(),
        date,
        isWriteOff: isExpense && !isTaxCategory ? isWriteOff : false,
        tags: isExpense ? [] : tags,
      };
      if (!isExpense) body.incomeType = incomeType;
      if (isTaxCategory && effectiveTaxYear !== dateYear) {
        body.taxYear = effectiveTaxYear;
      }

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || "Couldn't save");
        return;
      }
      setSaved(true);
      setTimeout(() => onSuccess?.(), 700);
    } catch (e) {
      console.error("Failed to save transaction:", e);
      setError("Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const accent = isExpense
    ? "bg-red-500 text-white hover:bg-red-600"
    : "bg-emerald-500 text-white hover:bg-emerald-600";

  const renderSubmit = (label: string) => (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={handleSubmit}
      disabled={!amount || !categoryId || saving || saved}
      className={cn(
        "flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-colors",
        saved
          ? "bg-emerald-500 text-white"
          : !amount || !categoryId
            ? "cursor-not-allowed bg-secondary text-muted-foreground"
            : accent,
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
        label
      )}
    </motion.button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AnimatePresence mode="wait" initial={false}>
        {step === "amount" ? (
          <motion.div
            key="amount-step"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {/* Amount */}
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl text-muted-foreground/60">€</span>
                <span
                  className={cn(
                    "text-6xl font-bold tabular-nums tracking-tight",
                    !amount && "text-muted-foreground/40",
                  )}
                >
                  {amount ? numericAmount.toFixed(2) : "0.00"}
                </span>
              </div>
              {selectedCategory ? (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId("");
                    setDescription("");
                  }}
                  className="flex max-w-full items-center gap-2 rounded-full bg-secondary/70 py-1.5 pl-2.5 pr-2 text-xs"
                >
                  <span>{selectedCategory.emoji}</span>
                  <span className="truncate">
                    {description ? `${description} · ` : ""}
                    <span className="text-muted-foreground">
                      {categoryLabel(selectedCategory, categoryIndex)}
                    </span>
                  </span>
                  <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {isExpense ? "How much did you spend?" : "How much came in?"}
                </span>
              )}
            </div>

            {/* Quick picks */}
            {quickPicks.length > 0 ? (
              <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 scrollbar-none">
                {quickPicks.map((pick) => {
                  const category = categoryIndex.byId.get(pick.categoryId);
                  const selected = pickedQuick?.key === pick.key;
                  return (
                    <Pill
                      key={pick.key}
                      selected={selected}
                      onClick={() => {
                        if (selected) {
                          setCategoryId("");
                          setDescription("");
                          setIsWriteOff(false);
                        } else {
                          applyPick(pick);
                        }
                      }}
                    >
                      <span>{category?.emoji ?? "📦"}</span>
                      {pick.description || category?.name}
                      {isExpense && pick.isWriteOff ? (
                        <FileText className="h-3 w-3 text-amber-400" />
                      ) : null}
                    </Pill>
                  );
                })}
              </div>
            ) : null}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-1.5">
              {keypadKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === "C") setAmount("");
                    else if (key === "⌫")
                      setAmount(amountFromDigits(digitsFromAmount(amount).slice(0, -1)));
                    else appendDigit(key);
                  }}
                  className={cn(
                    "flex h-14 items-center justify-center rounded-2xl bg-secondary/40 text-xl font-medium transition-colors active:bg-secondary",
                    key === "C" && "text-base text-muted-foreground",
                  )}
                >
                  {key === "⌫" ? <Delete className="h-5 w-5" /> : key}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3">
              {categoryId ? (
                <>
                  <button
                    type="button"
                    onClick={() => setStep("details")}
                    className="h-12 rounded-2xl bg-secondary px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Details
                  </button>
                  {renderSubmit(
                    amount ? `Add ${formatCurrency(numericAmount)}` : "Enter amount",
                  )}
                </>
              ) : (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep("details")}
                  disabled={!amount}
                  className={cn(
                    "h-12 flex-1 rounded-2xl text-sm font-semibold transition-colors",
                    amount ? accent : "cursor-not-allowed bg-secondary text-muted-foreground",
                  )}
                >
                  Choose category
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details-step"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex items-center justify-between pb-3">
              <button
                type="button"
                onClick={() => setStep("amount")}
                className="flex items-center gap-1 rounded-xl py-1.5 pr-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Amount
              </button>
              <button
                type="button"
                onClick={() => setStep("amount")}
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  isExpense ? "text-red-400" : "text-emerald-400",
                )}
              >
                {formatCurrency(numericAmount)}
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4">
              {/* Description */}
              <div>
                <input
                  type="text"
                  value={description}
                  onChange={(event) => handleDescriptionChange(event.target.value)}
                  placeholder={isExpense ? "What was it? (optional)" : "From where? (optional)"}
                  className="w-full rounded-2xl bg-secondary/50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary/40"
                />
                {suggestions.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {suggestions.map((entry) => (
                      <Pill key={entry.text} onClick={() => applyRemembered(entry)}>
                        <span>
                          {categoryIndex.byId.get(entry.categoryId)?.emoji ?? "📦"}
                        </span>
                        {entry.text}
                      </Pill>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Category */}
              <div>
                <FieldLabel>Category</FieldLabel>
                <CategoryPicker type={type} value={categoryId} onChange={setCategoryId} />
              </div>

              {/* Date */}
              <div>
                <FieldLabel>Date</FieldLabel>
                <Segmented
                  value={dateMode}
                  onChange={(mode) => {
                    if (mode === "today") setDate(todayKey);
                    else if (mode === "yesterday") setDate(yesterdayKey);
                    else openNativeDatePicker(date, setDate);
                  }}
                  options={[
                    { value: "today", label: "Today" },
                    { value: "yesterday", label: "Yesterday" },
                    {
                      value: "other",
                      label: (
                        <>
                          <Calendar className="h-3.5 w-3.5" />
                          {dateMode === "other"
                            ? dateKeyToDate(date).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                              })
                            : "Pick"}
                        </>
                      ),
                    },
                  ]}
                />
              </div>

              {/* Options */}
              {isExpense ? (
                isTaxCategory ? (
                  <div>
                    <FieldLabel>Pays tax for</FieldLabel>
                    <Segmented
                      value={effectiveTaxYear}
                      onChange={setTaxYear}
                      options={[dateYear, dateYear - 1].map((year) => ({
                        value: year,
                        label: String(year),
                      }))}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl bg-secondary/30 px-3">
                    <Switch
                      checked={isWriteOff}
                      onChange={setIsWriteOff}
                      icon={<FileText className="h-4 w-4" />}
                      label="Write-off"
                      description="Business expense, lowers your tax"
                    />
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Income type</FieldLabel>
                    <Segmented
                      value={incomeType}
                      onChange={setIncomeType}
                      options={[
                        { value: "neto", label: "Neto · tax already paid" },
                        { value: "bruto", label: "Bruto · I pay tax" },
                      ]}
                    />
                  </div>
                  {availableTags.length > 0 ? (
                    <div>
                      <FieldLabel>Tags</FieldLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {availableTags.map((tag) => (
                          <Pill
                            key={tag}
                            selected={tags.includes(tag)}
                            onClick={() =>
                              setTags((current) =>
                                current.includes(tag)
                                  ? current.filter((item) => item !== tag)
                                  : [...current, tag],
                              )
                            }
                          >
                            {tag}
                          </Pill>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {error ? <div className="text-xs text-red-400">{error}</div> : null}
            </div>

            <div className="flex pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-2">
              {renderSubmit(
                categoryId
                  ? `Add ${isExpense ? "expense" : "income"} · ${formatCurrency(numericAmount)}`
                  : "Choose a category",
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
