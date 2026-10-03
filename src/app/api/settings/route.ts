import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Settings from "@/lib/models/Settings";
import { getUserId } from "@/lib/auth";
import { DEFAULT_HOME_CARDS, normalizeHomeCards } from "@/lib/homeCards";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

// Fields added after launch; older settings documents don't have them yet.
const FIELD_DEFAULTS: Record<string, unknown> = {
  vsaoiRate: 31.07,
  vsaoiPensionRate: 10,
  vsaoiThreshold: 780,
  iinRate: 25.5,
  savingsGoal: 0,
  budgets: [],
  quickPicks: [],
};

function withDefaults(doc: Record<string, unknown>) {
  for (const [key, value] of Object.entries(FIELD_DEFAULTS)) {
    if (doc[key] === undefined || doc[key] === null) {
      doc[key] = Array.isArray(value) ? [...value] : value;
    }
  }
  return doc;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function sanitizeQuickPicks(value: unknown) {
  if (!Array.isArray(value)) return [];
  const picks: Record<string, unknown>[] = [];
  for (const item of value.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = String(record.categoryId ?? "");
    if (!mongoose.Types.ObjectId.isValid(id)) continue;
    const pick: Record<string, unknown> = {
      categoryId: new mongoose.Types.ObjectId(id),
    };
    const description = String(record.description ?? "").trim().slice(0, 60);
    if (description) pick.description = description;
    if (record.isWriteOff) pick.isWriteOff = true;
    if (record.incomeType === "bruto" || record.incomeType === "neto") {
      pick.incomeType = record.incomeType;
    }
    picks.push(pick);
  }
  return picks;
}

function sanitizeBudgets(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const budgets: { categoryId: mongoose.Types.ObjectId; amount: number }[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as { categoryId?: unknown; amount?: unknown };
    const id = String(record.categoryId ?? "");
    const amount = Number(record.amount);
    if (!mongoose.Types.ObjectId.isValid(id) || seen.has(id)) continue;
    if (!Number.isFinite(amount) || amount <= 0) continue;
    seen.add(id);
    budgets.push({
      categoryId: new mongoose.Types.ObjectId(id),
      amount: Math.round(amount * 100) / 100,
    });
  }
  return budgets;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const objectUserId = new mongoose.Types.ObjectId(userId);
    const settingsCollection = Settings.collection;
    let settings = await settingsCollection.findOne({ userId: objectUserId });

    if (!settings) {
      const now = new Date();
      const { insertedId } = await settingsCollection.insertOne({
        userId: objectUserId,
        currentBalance: 0,
        balanceDate: now,
        taxDebt: 0,
        taxDebtDate: now,
        creditDebt: 0,
        creditDebtDate: now,
        incomeTags: ["Freelance", "Salary", "Contract", "Other"],
        vsaoiRate: 31.07,
        vsaoiPensionRate: 10,
        vsaoiThreshold: 780,
        iinRate: 25.5,
        savingsGoal: 0,
        budgets: [],
        homeCards: DEFAULT_HOME_CARDS,
        createdAt: now,
        updatedAt: now,
      });
      settings = await settingsCollection.findOne({ _id: insertedId });
    }

    // Migrate old field name if it exists
    const doc = settings as Record<string, unknown>;
    if (doc.initialBalance !== undefined) {
      await Settings.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(String(doc._id)) },
        {
          $set: { currentBalance: doc.currentBalance ?? doc.initialBalance },
          $unset: { initialBalance: "" },
        },
      );
      if (doc.currentBalance === undefined) {
        doc.currentBalance = doc.initialBalance;
      }
      delete doc.initialBalance;
    }

    const normalizedHomeCards = normalizeHomeCards(doc.homeCards);
    if (JSON.stringify(doc.homeCards ?? []) !== JSON.stringify(normalizedHomeCards)) {
      await Settings.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(String(doc._id)) },
        { $set: { homeCards: normalizedHomeCards } },
      );
      doc.homeCards = normalizedHomeCards;
    }

    return NextResponse.json(withDefaults(doc), { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const objectUserId = new mongoose.Types.ObjectId(userId);
    const settingsCollection = Settings.collection;
    const body = { ...(await request.json()) } as Record<string, unknown>;
    delete body._id;
    delete body.userId;
    if (body.homeCards !== undefined) {
      body.homeCards = normalizeHomeCards(body.homeCards);
    }
    if (body.budgets !== undefined) {
      body.budgets = sanitizeBudgets(body.budgets);
    }
    if (body.quickPicks !== undefined) {
      body.quickPicks = sanitizeQuickPicks(body.quickPicks);
    }
    for (const key of [
      "currentBalance",
      "creditDebt",
      "vsaoiRate",
      "vsaoiPensionRate",
      "vsaoiThreshold",
      "iinRate",
      "savingsGoal",
    ]) {
      if (body[key] === undefined) continue;
      const value = Number(body[key]);
      if (!Number.isFinite(value)) {
        delete body[key];
      } else {
        body[key] = value;
      }
    }
    if (typeof body.savingsGoal === "number" && body.savingsGoal < 0) {
      body.savingsGoal = 0;
    }
    if (
      body.savingsStartMonth !== undefined &&
      !/^\d{4}-\d{2}$/.test(String(body.savingsStartMonth))
    ) {
      delete body.savingsStartMonth;
    }
    // Legacy: tax debt is now calculated from bruto income and tax payments.
    delete body.taxDebt;
    delete body.taxDebtDate;
    const settings = await settingsCollection.findOne({ userId: objectUserId });

    // Carry-over for the savings goal starts the month a goal is first set.
    if (
      typeof body.savingsGoal === "number" &&
      body.savingsGoal > 0 &&
      !settings?.savingsStartMonth &&
      !body.savingsStartMonth
    ) {
      body.savingsStartMonth = currentMonthKey();
    }

    // Auto-set dates when calibration values change
    if (
      body.currentBalance !== undefined &&
      settings &&
      body.currentBalance !== settings.currentBalance
    ) {
      body.balanceDate = new Date();
    }
    if (
      body.creditDebt !== undefined &&
      settings &&
      body.creditDebt !== settings.creditDebt
    ) {
      body.creditDebtDate = new Date();
    }

    const now = new Date();
    body.updatedAt = now;

    if (settings) {
      await settingsCollection.updateOne(
        { _id: settings._id, userId: objectUserId },
        { $set: body },
      );
    } else {
      body.balanceDate = body.balanceDate || new Date();
      body.creditDebtDate = body.creditDebtDate || new Date();
      body.homeCards = normalizeHomeCards(body.homeCards);
      await settingsCollection.insertOne({
        ...body,
        userId: objectUserId,
        createdAt: now,
      });
    }

    const updatedSettings = await settingsCollection.findOne({ userId: objectUserId });
    return NextResponse.json(
      updatedSettings ? withDefaults(updatedSettings as Record<string, unknown>) : null,
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
