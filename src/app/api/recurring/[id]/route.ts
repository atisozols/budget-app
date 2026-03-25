import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import RecurringPayment from "@/lib/models/RecurringPayment";
import Category from "@/lib/models/Category";
import { getUserId } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const body = { ...(await request.json()) } as Record<string, unknown>;
    const categoryId = body.categoryId;
    delete body._id;
    delete body.userId;
    delete body.categoryId;

    if (categoryId) {
      const category = await Category.findOne({ _id: categoryId, userId })
        .select("_id")
        .lean();

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 400 },
        );
      }

      body.categoryId = category._id;
    }

    const payment = await RecurringPayment.findOneAndUpdate(
      { _id: id, userId },
      body,
      {
        new: true,
      },
    )
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
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const payment = await RecurringPayment.findOneAndUpdate(
      { _id: id, userId },
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
