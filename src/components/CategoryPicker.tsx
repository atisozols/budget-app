"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryType } from "@/lib/types";
import { useAppData } from "@/lib/AppDataContext";
import { rootOf } from "@/lib/categories";
import { Pill } from "@/components/ui";

interface CategoryPickerProps {
  type: "expense" | "income";
  value: string;
  onChange: (categoryId: string) => void;
}

const VISIBLE = 8;

/**
 * Top-level categories as a 4-column grid (most used first, the rest behind
 * "More"); picking one with subcategories shows them as pills underneath.
 * Saving on the parent itself is allowed ("General").
 */
export default function CategoryPicker({
  type,
  value,
  onChange,
}: CategoryPickerProps) {
  const { categoryIndex, allTransactions } = useAppData();
  const [showAll, setShowAll] = useState(false);

  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    const add = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);
    for (const t of allTransactions) {
      if (t.type !== type || !t.categoryId) continue;
      add(t.categoryId._id);
      const root = rootOf(t.categoryId, categoryIndex);
      if (root && root._id !== t.categoryId._id) add(root._id);
    }
    return counts;
  }, [allTransactions, categoryIndex, type]);

  const byUsage = (a: CategoryType, b: CategoryType) =>
    (usage.get(b._id) ?? 0) - (usage.get(a._id) ?? 0) ||
    a.name.localeCompare(b.name);

  const roots = categoryIndex.roots
    .filter((category) => category.type === type)
    .sort(byUsage);

  const selected = value ? categoryIndex.byId.get(value) : undefined;
  const selectedRoot = selected ? rootOf(selected, categoryIndex) : null;
  const children = selectedRoot
    ? [...(categoryIndex.children.get(selectedRoot._id) ?? [])].sort(byUsage)
    : [];

  const needsMore = roots.length > VISIBLE;
  let visible = showAll || !needsMore ? roots : roots.slice(0, VISIBLE - 1);
  if (
    selectedRoot &&
    !visible.some((category) => category._id === selectedRoot._id)
  ) {
    visible = [...visible.slice(0, -1), selectedRoot];
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="grid grid-cols-4 gap-1.5">
        {visible.map((category) => {
          const isSelected = selectedRoot?._id === category._id;
          return (
            <button
              key={category._id}
              type="button"
              onClick={() => onChange(category._id)}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 ring-1 ring-inset transition-colors",
                isSelected
                  ? "bg-primary/10 ring-primary/50"
                  : "ring-transparent hover:bg-secondary/40",
              )}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: category.color + "22" }}
              >
                {category.emoji}
              </span>
              <span
                className={cn(
                  "w-full truncate text-center text-[10px] font-medium",
                  isSelected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {category.name}
              </span>
            </button>
          );
        })}
        {needsMore ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 hover:bg-secondary/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60 text-muted-foreground">
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  showAll && "rotate-180",
                )}
              />
            </span>
            <span className="w-full truncate text-center text-[10px] font-medium text-muted-foreground">
              {showAll ? "Less" : `${roots.length - (VISIBLE - 1)} more`}
            </span>
          </button>
        ) : null}
      </div>

      {selectedRoot && children.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <Pill
            selected={value === selectedRoot._id}
            onClick={() => onChange(selectedRoot._id)}
          >
            General
          </Pill>
          {children.map((category) => (
            <Pill
              key={category._id}
              selected={value === category._id}
              onClick={() => onChange(category._id)}
            >
              <span>{category.emoji}</span>
              {category.name}
            </Pill>
          ))}
        </div>
      ) : null}
    </div>
  );
}
