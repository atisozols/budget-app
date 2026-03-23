import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Settings from "@/lib/models/Settings";

export async function GET() {
  try {
    await connectToDatabase();
    let settings = await Settings.findOne().lean();

    if (!settings) {
      settings = await Settings.create({
        initialBalance: 0,
        taxDebt: 0,
        creditDebt: 0,
        incomeTags: ["Freelance", "Salary", "Contract", "Other"],
        vsaoiRate: 31.07,
        iinRate: 25.5,
      });
      settings = await Settings.findById(settings._id).lean();
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    let settings = await Settings.findOne();

    if (settings) {
      settings = await Settings.findByIdAndUpdate(settings._id, body, {
        new: true,
      }).lean();
    } else {
      settings = await Settings.create(body);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
