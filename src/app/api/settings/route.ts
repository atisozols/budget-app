import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Settings from "@/lib/models/Settings";
import { getUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    let settings = await Settings.findOne({ userId }).lean();

    if (!settings) {
      settings = await Settings.create({
        userId,
        currentBalance: 0,
        taxDebt: 0,
        creditDebt: 0,
        incomeTags: ["Freelance", "Salary", "Contract", "Other"],
        vsaoiRate: 31.07,
        iinRate: 25.5,
      });
      settings = await Settings.findById(settings._id).lean();
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

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
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
    const body = { ...(await request.json()) } as Record<string, unknown>;
    delete body._id;
    delete body.userId;
    let settings = await Settings.findOne({ userId });

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

    if (settings) {
      settings = await Settings.findOneAndUpdate({ _id: settings._id, userId }, body, {
        new: true,
      }).lean();
    } else {
      body.balanceDate = body.balanceDate || new Date();
      settings = await Settings.create({ ...body, userId });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
