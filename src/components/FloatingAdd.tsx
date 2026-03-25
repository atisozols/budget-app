"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import AddTransaction from "@/components/AddTransaction";
import { useAppData } from "@/lib/AppDataContext";

export default function FloatingAdd() {
  const [open, setOpen] = useState(false);
  const { refetchTransactions } = useAppData();

  return (
    <>
      {/* Floating + squircle bar */}
      <div
        className="fixed left-0 right-0 z-50 flex justify-center px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.25rem)" }}
      >
        <button
          onClick={() => setOpen(true)}
          className="w-full max-w-lg h-11 bg-primary text-primary-foreground flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] transition-transform"
          style={{ borderRadius: 16 }}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Drawer overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 z-60"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-70 bg-background rounded-t-3xl max-h-[90dvh] overflow-hidden"
              style={{
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
              }}
            >
              <div className="max-w-lg mx-auto w-full px-4 pt-3">
                {/* Drawer handle */}
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    New Transaction
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <AddTransaction
                  onSuccess={() => {
                    refetchTransactions();
                    setTimeout(() => setOpen(false), 1300);
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
