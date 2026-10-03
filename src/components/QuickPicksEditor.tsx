"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, FileText, Plus, Trash2 } from "lucide-react";
import { useAppData } from "@/lib/AppDataContext";
import { categoryLabel } from "@/lib/categories";
import type { IncomeType, QuickPick } from "@/lib/types";
import CategoryPicker from "@/components/CategoryPicker";
import { FieldLabel, Segmented, Switch } from "@/components/ui";

/** Pinned shortcuts shown first in the add-expense / add-income sheet. */
export default function QuickPicksEditor() {
  const { settings, categoryIndex, refetchSettings } = useAppData();
  const picks = settings?.quickPicks ?? [];
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [isWriteOff, setIsWriteOff] = useState(false);
  const [incomeType, setIncomeType] = useState<IncomeType>("neto");
  const [saving, setSaving] = useState(false);

  const save = async (next: QuickPick[]) => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quickPicks: next }),
      });
      await refetchSettings();
    } finally {
      setSaving(false);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= picks.length) return;
    const next = [...picks];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    save(next);
  };

  const add = async () => {
    if (!categoryId) return;
    const pick: QuickPick = { categoryId };
    if (description.trim()) pick.description = description.trim();
    if (type === "expense" && isWriteOff) pick.isWriteOff = true;
    if (type === "income") pick.incomeType = incomeType;
    await save([...picks, pick]);
    setCategoryId("");
    setDescription("");
    setIsWriteOff(false);
    setAdding(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pinned shortcuts appear first above the keypad. One tap fills in the
        category, note and write-off. The rest of the row fills itself with
        what you log most.
      </p>

      {picks.length > 0 ? (
        <div className="space-y-1.5">
          {picks.map((pick, index) => {
            const category = categoryIndex.byId.get(String(pick.categoryId));
            if (!category) return null;
            return (
              <div
                key={`${pick.categoryId}-${pick.description ?? ""}-${index}`}
                className="flex items-center gap-2.5 rounded-xl bg-secondary/50 p-2.5"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: category.color + "22" }}
                >
                  {category.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate text-xs font-medium">
                    {pick.description || category.name}
                    {pick.isWriteOff ? (
                      <FileText className="h-3 w-3 shrink-0 text-amber-400" />
                    ) : null}
                    {pick.incomeType ? (
                      <span className="rounded bg-primary/10 px-1 text-[9px] text-primary">
                        {pick.incomeType}
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {categoryLabel(category, categoryIndex)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || saving}
                  aria-label="Move up"
                  className="rounded-md p-1 text-muted-foreground disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === picks.length - 1 || saving}
                  aria-label="Move down"
                  className="rounded-md p-1 text-muted-foreground disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => save(picks.filter((_, i) => i !== index))}
                  disabled={saving}
                  aria-label="Remove quick pick"
                  className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {adding ? (
        <div className="space-y-4 rounded-xl bg-secondary p-3">
          <Segmented
            value={type}
            onChange={(value) => {
              setType(value);
              setCategoryId("");
            }}
            options={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
          />
          <div>
            <FieldLabel>Category</FieldLabel>
            <CategoryPicker type={type} value={categoryId} onChange={setCategoryId} />
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Note (optional), e.g. Lido"
            className="w-full rounded-lg bg-background/50 p-2.5 text-sm outline-none placeholder:text-muted-foreground/50"
          />
          {type === "expense" ? (
            <div className="rounded-lg bg-background/40 px-3">
              <Switch
                checked={isWriteOff}
                onChange={setIsWriteOff}
                icon={<FileText className="h-4 w-4" />}
                label="Write-off"
              />
            </div>
          ) : (
            <Segmented
              value={incomeType}
              onChange={setIncomeType}
              options={[
                { value: "neto", label: "Neto" },
                { value: "bruto", label: "Bruto" },
              ]}
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg bg-background/50 px-4 py-2 text-xs font-medium text-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={add}
              disabled={!categoryId || saving}
              className="flex-1 rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving..." : "Pin quick pick"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Add quick pick
        </button>
      )}
    </div>
  );
}
