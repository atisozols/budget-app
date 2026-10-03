"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, PiggyBank, Target } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppData } from "@/lib/AppDataContext";
import { useSpendable } from "@/lib/useFinance";
import { monthKeyLabel } from "@/lib/dates";
import SpendableCard from "@/components/SpendableCard";
import BudgetsPanel from "@/components/BudgetsPanel";
import BillsChecklist from "@/components/BillsChecklist";
import AmountInput from "@/components/AmountInput";

type PlanTab = "overview" | "budgets" | "bills";

function GoalEditor() {
  const { settings, refetchSettings } = useAppData();
  const current = settings?.savingsGoal ?? 0;
  const [value, setValue] = useState(current > 0 ? current.toFixed(2) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = (parseFloat(value) || 0) !== current;

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savingsGoal: parseFloat(value) || 0 }),
      });
      await refetchSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <PiggyBank className="h-3.5 w-3.5 text-primary" />
        Monthly savings goal
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Nothing gets moved or logged. The goal is simply kept out of what you
        can spend, so whatever is left in your account at month end is what you
        saved.
      </p>
      <div className="mt-3 flex gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-secondary p-2.5">
          <span className="text-sm text-muted-foreground">€</span>
          <AmountInput value={value} onChange={setValue} className="flex-1 text-sm" />
          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
            / month
          </span>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-medium transition-colors disabled:opacity-50",
            saved ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground",
          )}
        >
          {saved ? <Check className="h-4 w-4" /> : null}
          {saved ? "Saved" : saving ? "Saving" : "Save"}
        </button>
      </div>
      {settings?.savingsStartMonth ? (
        <div className="mt-2 text-[11px] text-muted-foreground">
          Months are counted from {monthKeyLabel(settings.savingsStartMonth)}.
          Anything above the goal carries into the next month, and so does any
          shortfall.
        </div>
      ) : null}
    </div>
  );
}

export default function PlanView({
  initialTab = "overview",
}: {
  initialTab?: PlanTab;
}) {
  const [tab, setTab] = useState<PlanTab>(initialTab);
  const spendable = useSpendable();
  const hits = spendable.history.filter((m) => m.vsGoal >= 0).length;
  const keptTotal = spendable.history.reduce((s, m) => s + m.kept, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Target className="h-5 w-5 text-primary" />
          Plan
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Your savings goal, budgets and monthly bills
        </p>
      </div>

      <div className="flex gap-1 rounded-xl bg-secondary/50 p-1">
        {(
          [
            { id: "overview", label: "Spendable" },
            { id: "budgets", label: "Budgets" },
            { id: "bills", label: "Bills" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
              tab === item.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-4">
          <SpendableCard result={spendable} defaultExpanded />
          <GoalEditor />
          {spendable.history.length > 0 ? (
            <div className="rounded-2xl bg-card p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Since {monthKeyLabel(spendable.startMonth)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {hits} of {spendable.history.length} months hit the goal
                </span>
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums">
                {formatCurrency(keptTotal)}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  kept of{" "}
                  {formatCurrency(spendable.goal * spendable.history.length)}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                {spendable.history.map((month) => (
                  <div
                    key={month.monthKey}
                    className="flex items-center justify-between text-xs"
                  >
                    <span>{monthKeyLabel(month.monthKey)}</span>
                    <span
                      className={cn(
                        "tabular-nums font-medium",
                        month.vsGoal >= 0 ? "text-emerald-400" : "text-red-400",
                      )}
                    >
                      kept {formatCurrency(month.kept)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="rounded-2xl border border-dashed border-border p-4 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">How it works:</span>{" "}
            every income you log raises what you can spend, after tax on bruto
            income is set aside automatically. Your savings goal and this
            month&apos;s bills come off the top. Tax payments come out of the tax
            set aside, so they don&apos;t count as spending. Regular income that
            hasn&apos;t arrived yet (a source that paid in at least 2 of the last 3
            months) is counted at the lowest amount it paid, so the plan doesn&apos;t
            lean on a good month. Anything extra that comes in raises it.
          </div>
        </div>
      ) : tab === "budgets" ? (
        <BudgetsPanel />
      ) : (
        <BillsChecklist />
      )}
    </motion.div>
  );
}
