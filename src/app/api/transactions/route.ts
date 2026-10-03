import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/Transaction";
import Category from "@/lib/models/Category";
import { getUserId } from "@/lib/auth";
import { sanitizeTransactionFields } from "@/lib/transactionPayload";

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

    // Stored dates are UTC midnight of the calendar day, so bound by UTC.
    if (month && year) {
      const y = parseInt(year);
      const m = parseInt(month);
      query.date = {
        $gte: new Date(Date.UTC(y, m - 1, 1)),
        $lt: new Date(Date.UTC(y, m, 1)),
      };
    } else if (year) {
      const y = parseInt(year);
      query.date = {
        $gte: new Date(Date.UTC(y, 0, 1)),
        $lt: new Date(Date.UTC(y + 1, 0, 1)),
      };
    }

    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .select("-userId -__v")
      .sort({ date: -1, createdAt: -1 })
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
    const payload = (await request.json()) as Record<string, unknown>;

    let fields: Record<string, unknown>;
    try {
      ({ fields } = sanitizeTransactionFields(payload));
    } catch (validationError) {
      return NextResponse.json(
        { error: (validationError as Error).message },
        { status: 400 },
      );
    }

    if (!fields.amount || !fields.type || !fields.date) {
      return NextResponse.json(
        { error: "Amount, type and date are required" },
        { status: 400 },
      );
    }

    const category = await Category.findOne({
      _id: payload.categoryId,
      userId,
    })
      .select("_id")
      .lean();

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 400 },
      );
    }

    const transaction = await Transaction.create({
      ...fields,
      userId,
      categoryId: category._id,
    });

    const populated = await Transaction.findById(transaction._id)
      .select("-userId -__v")
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
