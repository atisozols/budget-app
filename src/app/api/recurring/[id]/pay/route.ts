import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import RecurringPayment from "@/lib/models/RecurringPayment";
import Transaction from "@/lib/models/Transaction";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { date, amount: customAmount } = await request.json();

    const payment = await RecurringPayment.findById(id).populate("categoryId");
    if (!payment) {
      return NextResponse.json(
        { error: "Recurring payment not found" },
        { status: 404 },
      );
    }

    // Check if already paid this month
    const payDate = new Date(date);
    const monthStart = new Date(payDate.getFullYear(), payDate.getMonth(), 1);
    const monthEnd = new Date(
      payDate.getFullYear(),
      payDate.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const existing = await Transaction.findOne({
      recurringPaymentId: id,
      date: { $gte: monthStart, $lte: monthEnd },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already paid this month" },
        { status: 409 },
      );
    }

    const transaction = await Transaction.create({
      amount: customAmount != null ? customAmount : payment.amount,
      type: "expense",
      categoryId: payment.categoryId._id,
      description: payment.name,
      date: payDate,
      isWriteOff: payment.isWriteOff || false,
      recurringPaymentId: payment._id,
    });

    const populated = await Transaction.findById(transaction._id)
      .populate("categoryId")
      .lean();

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error("POST /api/recurring/[id]/pay error:", error);
    return NextResponse.json(
      { error: "Failed to pay recurring payment" },
      { status: 500 },
    );
  }
}
