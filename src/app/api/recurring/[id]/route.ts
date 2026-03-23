import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import RecurringPayment from "@/lib/models/RecurringPayment";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const payment = await RecurringPayment.findByIdAndUpdate(id, body, {
      new: true,
    })
      .populate("categoryId")
      .lean();

    if (!payment) {
      return NextResponse.json(
        { error: "Recurring payment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("PUT /api/recurring/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update recurring payment" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const payment = await RecurringPayment.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!payment) {
      return NextResponse.json(
        { error: "Recurring payment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/recurring/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete recurring payment" },
      { status: 500 },
    );
  }
}
