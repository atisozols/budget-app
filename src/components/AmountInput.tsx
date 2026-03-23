"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  autoFocus?: boolean;
}

export default function AmountInput({
  value,
  onChange,
  className,
  autoFocus,
}: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, "");
    if (!digits || parseInt(digits, 10) === 0) {
      onChange("");
      return;
    }
    const cents = parseInt(digits, 10);
    onChange((cents / 100).toFixed(2));
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value ? parseFloat(value).toFixed(2) : "0.00"}
      onChange={handleChange}
      className={cn("bg-transparent outline-none", className)}
      autoFocus={autoFocus}
    />
  );
}
