import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/Transaction";
import Settings from "@/lib/models/Settings";
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

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, userId },
      body,
      {
        new: true,
      },
    )
      .populate("categoryId")
      .lean();

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("PUT /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
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
    const transaction = await Transaction.findOneAndDelete({ _id: id, userId });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // Reverse debt adjustment if this was a debt payment
    if (transaction.debtPayment) {
      const field =
        transaction.debtPayment === "tax" ? "taxDebt" : "creditDebt";
      await Settings.findOneAndUpdate(
        { userId },
        {
          $inc: { [field]: transaction.amount },
          $setOnInsert: { userId },
        },
        {
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 },
    );
  }
}
