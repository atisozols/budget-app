import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Settings from "@/lib/models/Settings";

export async function GET() {
  try {
    await connectToDatabase();
    let settings = await Settings.findOne().lean();

    if (!settings) {
      settings = await Settings.create({
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
      const mongoose = await import("mongoose");
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
    await connectToDatabase();
    const body = await request.json();
    let settings = await Settings.findOne();

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
      settings = await Settings.findByIdAndUpdate(settings._id, body, {
        new: true,
      }).lean();
    } else {
      body.balanceDate = body.balanceDate || new Date();
      settings = await Settings.create(body);
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
