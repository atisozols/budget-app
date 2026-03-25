import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Settings from "@/lib/models/Settings";
import { getUserId } from "@/lib/auth";
import { DEFAULT_HOME_CARDS, normalizeHomeCards } from "@/lib/homeCards";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

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
        iinRate: 25.5,
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

    return NextResponse.json(settings, { headers: NO_STORE_HEADERS });
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
    const settings = await settingsCollection.findOne({ userId: objectUserId });

    // Auto-set dates when calibration values change
    if (
      body.currentBalance !== undefined &&
      settings &&
      body.currentBalance !== settings.currentBalance
    ) {
      body.balanceDate = new Date();
    }
    if (
      body.taxDebt !== undefined &&
      settings &&
      body.taxDebt !== settings.taxDebt
    ) {
      body.taxDebtDate = new Date();
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
      body.taxDebtDate = body.taxDebtDate || new Date();
      body.creditDebtDate = body.creditDebtDate || new Date();
      body.homeCards = normalizeHomeCards(body.homeCards);
      await settingsCollection.insertOne({
        ...body,
        userId: objectUserId,
        createdAt: now,
      });
    }

    const updatedSettings = await settingsCollection.findOne({ userId: objectUserId });
    return NextResponse.json(updatedSettings, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
