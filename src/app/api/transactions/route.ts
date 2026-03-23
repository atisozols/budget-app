import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/Transaction";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const type = searchParams.get("type");

    const query: Record<string, unknown> = {};

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
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
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const transaction = await Transaction.create(body);
    const populated = await Transaction.findById(transaction._id)
      .populate("categoryId")
      .lean();
    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error("POST /api/transactions error:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
