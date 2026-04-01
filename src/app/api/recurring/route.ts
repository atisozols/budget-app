import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import RecurringPayment from "@/lib/models/RecurringPayment";
import Category from "@/lib/models/Category";
import { getUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const recurring = await RecurringPayment.find({ userId })
      .populate("categoryId")
      .sort({ dueDay: 1 })
      .lean();
    return NextResponse.json(recurring);
  } catch (error) {
    console.error("GET /api/recurring error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recurring payments" },
      { status: 500 },
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
    const body = { ...(await request.json()) } as Record<string, unknown>;
    const categoryId = body.categoryId;
    delete body._id;
    delete body.userId;
    delete body.categoryId;

    const category = await Category.findOne({ _id: categoryId, userId })
      .select("_id")
      .lean();

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 400 },
      );
    }

    // Default startDate to first day of current month for new payments
    if (!body.startDate) {
      const now = new Date();
      body.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const payment = await RecurringPayment.create({
      ...body,
      userId,
      categoryId: category._id,
    });
    const populated = await RecurringPayment.findById(payment._id)
      .populate("categoryId")
      .lean();
    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error("POST /api/recurring error:", error);
    return NextResponse.json(
      { error: "Failed to create recurring payment" },
      { status: 500 },
    );
  }
}
