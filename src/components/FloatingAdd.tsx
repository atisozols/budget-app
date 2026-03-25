"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownCircle, ArrowUpCircle, X } from "lucide-react";
import AddTransaction from "@/components/AddTransaction";
import { useAppData } from "@/lib/AppDataContext";

type SheetType = "expense" | "income" | null;

export default function FloatingAdd() {
  const [sheetType, setSheetType] = useState<SheetType>(null);
  const { refetchTransactions } = useAppData();
  const open = sheetType !== null;

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  return (
    <>
      <div
        className="fixed left-0 right-0 z-50 flex justify-center px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.25rem)" }}
      >
        <div className="grid w-full max-w-lg grid-cols-2 gap-2">
          <button
            onClick={() => setSheetType("expense")}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-500 text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowDownCircle className="h-4.5 w-4.5" />
            <span className="text-sm font-semibold">Expense</span>
          </button>
          <button
            onClick={() => setSheetType("income")}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowUpCircle className="h-4.5 w-4.5" />
            <span className="text-sm font-semibold">Income</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetType(null)}
              className="fixed inset-0 bg-black/60 z-60"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-0 z-70 overflow-hidden overscroll-none bg-background"
              aria-modal="true"
              role="dialog"
            >
              <div className="mx-auto flex h-full w-full max-w-lg flex-col px-4">
                <div
                  className="flex items-center justify-between py-3"
                  style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
                >
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    New {sheetType === "expense" ? "Expense" : "Income"}
                  </div>
                  <button
                    onClick={() => setSheetType(null)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <AddTransaction
                  key={sheetType}
                  initialType={sheetType ?? "expense"}
                  onSuccess={() => {
                    refetchTransactions();
                    setSheetType(null);
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
