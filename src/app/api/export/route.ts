import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/Transaction";
import Category from "@/lib/models/Category";
import RecurringPayment from "@/lib/models/RecurringPayment";
import Settings from "@/lib/models/Settings";
import { getUserId } from "@/lib/auth";

function stripManagedFields(record: Record<string, unknown>) {
  const sanitized = { ...record };
  delete sanitized._id;
  delete sanitized.userId;
  delete sanitized.__v;
  delete sanitized.createdAt;
  delete sanitized.updatedAt;
  return sanitized;
}

function extractId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    const nestedId = (value as { _id?: unknown })._id;
    return nestedId ? String(nestedId) : null;
  }
  return String(value);
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const [transactions, categories, recurring, settings] = await Promise.all([
      Transaction.find({ userId }).lean(),
      Category.find({ userId }).lean(),
      RecurringPayment.find({ userId }).lean(),
      Settings.findOne({ userId }).lean(),
    ]);

    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      transactions,
      categories,
      recurring,
      settings,
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const data = await request.json();

    if (data.version !== 1) {
      return NextResponse.json(
        { error: "Unsupported export version" },
        { status: 400 }
      );
    }

    const categoryIds = new Map<string, mongoose.Types.ObjectId>();
    const recurringIds = new Map<string, mongoose.Types.ObjectId>();

    const categoriesToInsert = Array.isArray(data.categories)
      ? data.categories.map((category: Record<string, unknown>) => {
          const newId = new mongoose.Types.ObjectId();
          const previousId = extractId(category._id);
          if (previousId) {
            categoryIds.set(previousId, newId);
          }

          return {
            ...stripManagedFields(category),
            _id: newId,
            userId,
          };
        })
      : [];

    const recurringToInsert = Array.isArray(data.recurring)
      ? data.recurring.map((payment: Record<string, unknown>) => {
          const newId = new mongoose.Types.ObjectId();
          const previousId = extractId(payment._id);
          if (previousId) {
            recurringIds.set(previousId, newId);
          }

          const categoryId = extractId(payment.categoryId);
          return {
            ...stripManagedFields(payment),
            _id: newId,
            userId,
            categoryId: categoryId ? categoryIds.get(categoryId) ?? undefined : undefined,
          };
        })
      : [];

    const transactionsToInsert = Array.isArray(data.transactions)
      ? data.transactions.map((transaction: Record<string, unknown>) => {
          const categoryId = extractId(transaction.categoryId);
          const recurringPaymentId = extractId(transaction.recurringPaymentId);
          return {
            ...stripManagedFields(transaction),
            _id: new mongoose.Types.ObjectId(),
            userId,
            categoryId: categoryId ? categoryIds.get(categoryId) ?? undefined : undefined,
            recurringPaymentId: recurringPaymentId
              ? recurringIds.get(recurringPaymentId) ?? undefined
              : undefined,
          };
        })
      : [];

    const settingsToInsert =
      data.settings && typeof data.settings === "object"
        ? {
            ...stripManagedFields(data.settings as Record<string, unknown>),
            userId,
          }
        : null;

    // Clear only the current user's data
    await Promise.all([
      Transaction.deleteMany({ userId }),
      Category.deleteMany({ userId }),
      RecurringPayment.deleteMany({ userId }),
      Settings.deleteMany({ userId }),
    ]);

    const promises: Promise<unknown>[] = [];
    if (categoriesToInsert.length) {
      promises.push(Category.insertMany(categoriesToInsert));
    }
    if (recurringToInsert.length) {
      promises.push(RecurringPayment.insertMany(recurringToInsert));
    }
    if (transactionsToInsert.length) {
      promises.push(Transaction.insertMany(transactionsToInsert));
    }
    if (settingsToInsert) {
      promises.push(Settings.create(settingsToInsert));
    }

    await Promise.all(promises);

    return NextResponse.json({ success: true, message: "Data imported successfully" });
  } catch (error) {
    console.error("POST /api/export error:", error);
    return NextResponse.json(
      { error: "Failed to import data" },
      { status: 500 }
    );
  }
}
