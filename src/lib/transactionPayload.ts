// Whitelists the editable transaction fields coming from the client.
// Dates arrive as "YYYY-MM-DD" (or ISO) and are stored as UTC midnight of
// that calendar day, matching every existing record.

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function parseTransactionDate(value: unknown): Date | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const raw = value instanceof Date ? value.toISOString() : value;
  const key = raw.slice(0, 10);
  if (!DATE_KEY.test(key)) return null;
  const date = new Date(`${key}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sanitizeTransactionFields(body: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  const unset: Record<string, ""> = {};

  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }
    fields.amount = Math.round(amount * 100) / 100;
  }

  if (body.type !== undefined) {
    if (body.type !== "expense" && body.type !== "income") {
      throw new Error("Invalid type");
    }
    fields.type = body.type;
  }

  if (body.date !== undefined) {
    const date = parseTransactionDate(body.date);
    if (!date) throw new Error("Invalid date");
    fields.date = date;
  }

  if (body.description !== undefined) {
    fields.description = String(body.description ?? "").trim().slice(0, 200);
  }

  if (body.tags !== undefined) {
    fields.tags = Array.isArray(body.tags)
      ? body.tags.filter((tag): tag is string => typeof tag === "string")
      : [];
  }

  if (body.isWriteOff !== undefined) {
    fields.isWriteOff = Boolean(body.isWriteOff);
  }

  if (body.incomeType !== undefined) {
    if (body.incomeType === "bruto" || body.incomeType === "neto") {
      fields.incomeType = body.incomeType;
    } else {
      unset.incomeType = "";
    }
  }

  if (body.taxYear !== undefined) {
    const taxYear = Number(body.taxYear);
    if (body.taxYear === null || !Number.isInteger(taxYear)) {
      unset.taxYear = "";
    } else {
      fields.taxYear = taxYear;
    }
  }

  return { fields, unset };
}
