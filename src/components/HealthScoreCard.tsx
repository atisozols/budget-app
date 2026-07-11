"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HeartPulse } from "lucide-react";
import { healthColor, type HealthResult } from "@/lib/insights";

export default function HealthScoreCard({ health }: { health: HealthResult }) {
  const [expanded, setExpanded] = useState(false);
  const circumference = 2 * Math.PI * 20;
  const strokeDashoffset =
    circumference - (health.score / 100) * circumference;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: health.color + "14",
        border: `1px solid ${health.color}2e`,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 flex items-center gap-3 text-left"
        aria-expanded={expanded}
      >
        <div className="relative w-12 h-12 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 46 46">
            <circle
              cx="23"
              cy="23"
              r="20"
              fill="none"
              stroke={health.color + "26"}
              strokeWidth="4"
            />
            <motion.circle
              cx="23"
              cy="23"
              r="20"
              fill="none"
              stroke={health.color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-sm font-bold"
              style={{ color: health.color }}
            >
              {health.score}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
            <HeartPulse className="w-3 h-3" style={{ color: health.color }} />
            Financial Health
          </div>
          <div
            className="text-sm font-semibold"
            style={{ color: health.color }}
          >
            {health.label}
          </div>
        </div>

        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-muted-foreground shrink-0"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-4 pb-4 space-y-2.5">
              {health.factors.map((factor, i) => (
                <div key={factor.key}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {factor.label}
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: healthColor(factor.score) }}
                    >
                      {factor.score}
                    </span>
                  </div>
                  <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: health.color + "1a" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: healthColor(factor.score) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${factor.score}%` }}
                      transition={{ duration: 0.6, delay: i * 0.06 }}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground truncate">
                    {factor.detail}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
