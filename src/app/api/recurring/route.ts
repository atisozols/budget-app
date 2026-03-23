import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import RecurringPayment from "@/lib/models/RecurringPayment";

export async function GET() {
  try {
    await connectToDatabase();
    const recurring = await RecurringPayment.find()
      .populate("categoryId")
      .sort({ dueDay: 1 })
      .lean();
    return NextResponse.json(recurring);
  } catch (error) {
    console.error("GET /api/recurring error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recurring payments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const payment = await RecurringPayment.create(body);
    const populated = await RecurringPayment.findById(payment._id)
      .populate("categoryId")
      .lean();
    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error("POST /api/recurring error:", error);
    return NextResponse.json(
      { error: "Failed to create recurring payment" },
      { status: 500 }
    );
  }
}
