"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Tag, Pencil, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryType, BudgetType } from "@/lib/types";

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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📦");
  const [color, setColor] = useState("#6366f1");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [budgetType, setBudgetType] = useState<BudgetType>("needs");
  const [filterType, setFilterType] = useState<"expense" | "income">("expense");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  const resetForm = () => {
    setName("");
    setEmoji("📦");
    setColor("#6366f1");
    setType("expense");
    setBudgetType("needs");
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (cat: CategoryType) => {
    setName(cat.name);
    setEmoji(cat.emoji);
    setColor(cat.color);
    setType(cat.type);
    setBudgetType(cat.budgetType);
    setEditingId(cat._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name) return;
    try {
      const body = { name, emoji, color, type, budgetType };
      let res;
      if (editingId) {
        res = await fetch(`/api/categories/${editingId}`, {
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
        if (editingId) {
          setCategories((prev) =>
            prev.map((c) => (c._id === editingId ? saved : c)),
          );
        } else {
          setCategories((prev) => [...prev, saved]);
        }
        resetForm();
      }
    } catch (error) {
      console.error("Failed to save category:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const filtered = categories.filter((c) => c.type === filterType);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Categories
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize with emojis and colors
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="p-2 bg-primary/20 text-primary rounded-xl hover:bg-primary/30 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={cn(
              "flex-1 py-2 rounded-xl text-sm font-medium transition-all capitalize",
              filterType === t
                ? "bg-primary/20 text-primary"
                : "bg-secondary text-muted-foreground",
            )}
          >
            {t} ({categories.filter((c) => c.type === t).length})
          </button>
        ))}
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-card rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {editingId ? "Edit Category" : "New Category"}
                </h3>
                <button onClick={resetForm} className="text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: color + "20" }}
                >
                  {emoji}
                </span>
                <div>
                  <div className="text-sm font-medium">
                    {name || "Category Name"}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {type}
                    {type === "expense" ? ` · ${budgetType}` : ""}
                  </div>
                </div>
              </div>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                className="w-full p-2.5 bg-secondary rounded-xl text-sm outline-none"
              />

              {/* Type */}
              <div className="flex gap-2">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-medium transition-all capitalize",
                      type === t
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Budget Type (expenses only) */}
              {type === "expense" && (
                <div className="flex gap-2">
                  {(["needs", "wants", "savings"] as const).map((bt) => (
                    <button
                      key={bt}
                      onClick={() => setBudgetType(bt)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-medium transition-all capitalize",
                        budgetType === bt
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              )}

              {/* Emoji Picker */}
              <div>
                <label className="text-xs text-muted-foreground">Emoji</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={emoji}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= 2) setEmoji(val);
                    }}
                    className="w-12 h-12 rounded-xl bg-secondary text-center text-2xl outline-none focus:ring-2 focus:ring-primary"
                    placeholder="🔹"
                  />
                  <span className="text-xs text-muted-foreground">
                    Type or paste any emoji
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all",
                        emoji === e
                          ? "bg-primary/20 ring-2 ring-primary"
                          : "bg-secondary hover:bg-secondary/80",
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-xs text-muted-foreground">Color</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        "w-8 h-8 rounded-lg transition-all flex items-center justify-center",
                        color === c && "ring-2 ring-white scale-110",
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={!name}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {editingId ? "Save Changes" : "Create Category"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories List */}
      <div className="space-y-1.5">
        <AnimatePresence>
          {filtered.map((cat, i) => (
            <motion.div
              key={cat._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl group"
            >
              <span
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: cat.color + "20" }}
              >
                {cat.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{cat.name}</div>
                {cat.type === "expense" && (
                  <div className="text-xs text-muted-foreground capitalize">
                    {cat.budgetType}
                  </div>
                )}
              </div>
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(cat)}
                  className="p-1.5 rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat._id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
