"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Small shared controls so chips, toggles and segmented pickers look the
// same everywhere.

export function Pill({
  selected,
  onClick,
  children,
  tone = "primary",
  className,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  tone?: "primary" | "amber" | "orange";
  className?: string;
}) {
  const selectedTone =
    tone === "amber"
      ? "bg-amber-500/15 text-amber-300 ring-amber-500/40"
      : tone === "orange"
        ? "bg-orange-500/15 text-orange-300 ring-orange-500/40"
        : "bg-primary/15 text-primary ring-primary/40";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium ring-1 ring-inset transition-colors",
        selected
          ? selectedTone
          : "bg-secondary/60 text-muted-foreground ring-transparent hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 rounded-xl bg-secondary/50 p-1", className)}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all",
            value === option.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  icon,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 py-2.5 text-left"
    >
      {icon ? <span className="shrink-0 text-muted-foreground">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{label}</span>
        {description ? (
          <span className="block text-[11px] text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-amber-500" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-medium text-muted-foreground">
      {children}
    </div>
  );
}
