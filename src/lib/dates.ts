// ─── Day boundaries ──────────────────────────────────────────────────
// The day rolls over at 4am, not midnight: an expense logged at 1am still
// belongs to the day you haven't gone to sleep on yet.

export const DAY_ROLLOVER_HOUR = 4;

/** Wall-clock "now" shifted so that 00:00–03:59 still reads as yesterday. */
export function logicalNow(now: Date = new Date()) {
  return new Date(now.getTime() - DAY_ROLLOVER_HOUR * 60 * 60 * 1000);
}

/** Local midnight of the logical day. */
export function logicalToday(now: Date = new Date()) {
  const d = logicalNow(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function logicalTodayKey(now: Date = new Date()) {
  return toDateKey(logicalToday(now));
}

/** YYYY-MM-DD → local midnight Date (safe for display/formatting). */
export function dateKeyToDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function shiftDateKey(key: string, days: number) {
  const d = dateKeyToDate(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

// ─── Stored transaction dates ────────────────────────────────────────
// Transactions are stored as UTC midnight of the chosen calendar day
// ("2026-10-02" → 2026-10-02T00:00:00Z), so the UTC date is canonical.

export function txDateKey(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}

/** "YYYY-MM" of a stored transaction date. */
export function txMonthKey(value: string | Date) {
  return txDateKey(value).slice(0, 7);
}

export function monthKey(year: number, monthIndex: number) {
  const d = new Date(year, monthIndex, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyOf(date: Date) {
  return monthKey(date.getFullYear(), date.getMonth());
}

export function shiftMonthKey(key: string, months: number) {
  const [y, m] = key.split("-").map(Number);
  return monthKey(y, m - 1 + months);
}

export function daysInMonthKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthKeyLabel(key: string, short = false) {
  const [y, m] = key.split("-").map(Number);
  return `${(short ? MONTH_SHORT : MONTH_NAMES)[m - 1]} ${y}`;
}
