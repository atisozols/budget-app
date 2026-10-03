import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/Transaction";
import Category from "@/lib/models/Category";
import { getUserId } from "@/lib/auth";
import { sanitizeTransactionFields } from "@/lib/transactionPayload";

// Debt and tax balances are derived from transactions on the client, so
// editing or deleting a transaction never has to patch Settings.

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
    const body = (await request.json()) as Record<string, unknown>;

    let fields: Record<string, unknown>;
    let unset: Record<string, "">;
    try {
      ({ fields, unset } = sanitizeTransactionFields(body));
    } catch (validationError) {
      return NextResponse.json(
        { error: (validationError as Error).message },
        { status: 400 },
      );
    }
    // The type of an existing transaction can't change.
    delete fields.type;

    if (body.categoryId) {
      const category = await Category.findOne({ _id: body.categoryId, userId })
        .select("_id")
        .lean();

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 400 },
        );
      }

      fields.categoryId = category._id;
    }

    const update: Record<string, unknown> = { $set: fields };
    if (Object.keys(unset).length > 0) update.$unset = unset;

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, userId },
      update,
      { new: true },
    )
      .select("-userId -__v")
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 },
    );
  }
}
