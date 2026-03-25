import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/Transaction";
import Settings from "@/lib/models/Settings";
import Category from "@/lib/models/Category";
import { getUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const type = searchParams.get("type");

    const query: Record<string, unknown> = { userId };

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query.date = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .populate("categoryId")
      .lean();

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
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
    const payload = { ...(await request.json()) } as Record<string, unknown>;
    const categoryId = payload.categoryId;
    delete payload._id;
    delete payload.userId;
    delete payload.categoryId;

    const category = await Category.findOne({ _id: categoryId, userId })
      .select("_id")
      .lean();

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 400 },
      );
    }

    const transaction = await Transaction.create({
      ...payload,
      userId,
      categoryId: category._id,
    });

    // Auto-reduce debt when a debt payment is logged
    if (payload.debtPayment) {
      const field =
        payload.debtPayment === "tax" ? "taxDebt" : "creditDebt";
      await Settings.findOneAndUpdate(
        { userId },
        {
          $inc: { [field]: -transaction.amount },
          $setOnInsert: { userId },
        },
        {
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );
    }

    const populated = await Transaction.findById(transaction._id)
      .populate("categoryId")
      .lean();
    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error("POST /api/transactions error:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 },
    );
  }
}
