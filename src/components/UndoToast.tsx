"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Trash2 } from "lucide-react";
import { useAppData } from "@/lib/AppDataContext";
import { formatCurrency } from "@/lib/utils";

export default function UndoToast() {
  const { lastDeleted, undoDelete } = useAppData();

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-[80] flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 7.75rem)" }}
    >
      <AnimatePresence>
        {lastDeleted ? (
          <motion.div
            key={lastDeleted._id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-lg shadow-black/40"
            role="status"
          >
            <Trash2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1 truncate text-sm">
              Deleted{" "}
              <span className="font-medium">
                {lastDeleted.description || lastDeleted.categoryId?.name || "entry"}
              </span>{" "}
              <span className="text-muted-foreground">
                {formatCurrency(lastDeleted.amount)}
              </span>
            </div>
            <button
              type="button"
              onClick={undoDelete}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Undo
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
