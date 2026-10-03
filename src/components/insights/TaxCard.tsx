"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Landmark } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useTaxRates, useTaxYear } from "@/lib/useFinance";
import { MONTH_SHORT, txDateKey } from "@/lib/dates";
import { taxShareOfIncome } from "@/lib/tax";
import { format } from "date-fns";
import { dateKeyToDate } from "@/lib/dates";

export default function TaxCard({
  year,
  highlightMonth,
}: {
  year: number;
  highlightMonth?: number;
}) {
  const tax = useTaxYear(year);
  const rates = useTaxRates();
  const [open, setOpen] = useState(false);
  const months = tax.months.filter(
    (m) => m.bruto > 0 || m.writeOffs > 0 || Math.abs(m.total) > 0.005,
  );
  const owedAfter = tax.outstanding;

  if (tax.bruto === 0 && tax.paid === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Landmark className="h-3.5 w-3.5 text-orange-400" />
            Tax {year} · bruto income
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div>
            <div className="text-[10px] text-muted-foreground">Owed</div>
            <div className="text-base font-bold tabular-nums">
              {formatCurrency(tax.owed)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Paid</div>
            <div className="text-base font-bold text-emerald-400 tabular-nums">
              {formatCurrency(tax.paid)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">
              {owedAfter >= 0 ? "Still to pay" : "Overpaid"}
            </div>
            <div
              className={cn(
                "text-base font-bold tabular-nums",
                owedAfter > 0 ? "text-orange-400" : "text-emerald-400",
              )}
            >
              {formatCurrency(Math.abs(owedAfter))}
            </div>
          </div>
        </div>
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          {formatCurrency(tax.bruto)} bruto − {formatCurrency(tax.writeOffs)}{" "}
          write-offs = {formatCurrency(tax.profit)} profit · VSAOI{" "}
          {formatCurrency(tax.vsaoi)} + IIN {formatCurrency(tax.iin)}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-4">
              <div>
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  By month
                </div>
                <div className="overflow-hidden rounded-xl bg-secondary/40">
                  <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr] gap-x-2 border-b border-border/50 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span />
                    <span className="text-right">Bruto</span>
                    <span className="text-right">Write-offs</span>
                    <span className="text-right">Tax</span>
                  </div>
                  {months.map((m) => (
                    <div
                      key={m.month}
                      className={cn(
                        "grid grid-cols-[2.5rem_1fr_1fr_1fr] gap-x-2 px-3 py-1.5 text-xs tabular-nums",
                        highlightMonth === m.month && "bg-primary/10",
                      )}
                    >
                      <span className="text-muted-foreground">
                        {MONTH_SHORT[m.month]}
                      </span>
                      <span className="text-right">{formatCurrency(m.bruto)}</span>
                      <span className="text-right text-amber-400">
                        {m.writeOffs ? `−${formatCurrency(m.writeOffs)}` : "—"}
                      </span>
                      <span className="text-right font-medium">
                        {m.total < 0 ? "−" : ""}
                        {formatCurrency(Math.abs(m.total))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {tax.brutoIncomes.length > 0 ? (
                <div>
                  <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Set aside per income
                  </div>
                  <div className="space-y-1">
                    {tax.brutoIncomes
                      .slice()
                      .sort((a, b) =>
                        txDateKey(b.date).localeCompare(txDateKey(a.date)),
                      )
                      .map((t) => {
                        const month = Number(txDateKey(t.date).slice(5, 7)) - 1;
                        const share = taxShareOfIncome(t, tax.months[month]);
                        return (
                          <div
                            key={t._id}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="min-w-0 truncate">
                              <span className="text-muted-foreground">
                                {format(dateKeyToDate(txDateKey(t.date)), "MMM d")}
                              </span>{" "}
                              {t.description || t.categoryId?.name}
                            </span>
                            <span className="shrink-0 tabular-nums">
                              {formatCurrency(t.amount)}
                              <span className="text-orange-400">
                                {" "}
                                → {formatCurrency(Math.max(0, share))}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Payments counted for {year}
                </div>
                {tax.payments.length === 0 ? (
                  <div className="text-xs text-muted-foreground">None yet</div>
                ) : (
                  <div className="space-y-1">
                    {tax.payments
                      .slice()
                      .sort((a, b) =>
                        txDateKey(b.date).localeCompare(txDateKey(a.date)),
                      )
                      .map((t) => (
                        <div
                          key={t._id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">
                            {format(dateKeyToDate(txDateKey(t.date)), "MMM d, yyyy")}
                            {t.description ? ` · ${t.description}` : ""}
                          </span>
                          <span className="tabular-nums text-emerald-400">
                            {formatCurrency(t.amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-dashed border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
                Each month: profit = bruto − write-offs. VSAOI is{" "}
                {rates.vsaoiRate}% of the first {formatCurrency(rates.vsaoiThreshold)}{" "}
                plus {rates.vsaoiPensionRate}% of the rest (only{" "}
                {rates.vsaoiPensionRate}% if profit is under{" "}
                {formatCurrency(rates.vsaoiThreshold)}). IIN is {rates.iinRate}% of
                the year&apos;s profit after VSAOI. Payments in a tax category count
                toward the year chosen on the payment. Rates are in Settings.
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
