import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/Transaction";
import Category from "@/lib/models/Category";
import RecurringPayment from "@/lib/models/RecurringPayment";
import Settings from "@/lib/models/Settings";

export async function GET() {
  try {
    await connectToDatabase();

    const [transactions, categories, recurring, settings] = await Promise.all([
      Transaction.find().lean(),
      Category.find().lean(),
      RecurringPayment.find().lean(),
      Settings.findOne().lean(),
    ]);

    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      transactions,
      categories,
      recurring,
      settings,
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();

    if (data.version !== 1) {
      return NextResponse.json(
        { error: "Unsupported export version" },
        { status: 400 }
      );
    }

    // Clear existing data
    await Promise.all([
      Transaction.deleteMany({}),
      Category.deleteMany({}),
      RecurringPayment.deleteMany({}),
      Settings.deleteMany({}),
    ]);

    // Import new data
    const promises = [];
    if (data.categories?.length) {
      promises.push(Category.insertMany(data.categories));
    }
    if (data.transactions?.length) {
      promises.push(Transaction.insertMany(data.transactions));
    }
    if (data.recurring?.length) {
      promises.push(RecurringPayment.insertMany(data.recurring));
    }
    if (data.settings) {
      promises.push(Settings.create(data.settings));
    }

    await Promise.all(promises);

    return NextResponse.json({ success: true, message: "Data imported successfully" });
  } catch (error) {
    console.error("POST /api/export error:", error);
    return NextResponse.json(
      { error: "Failed to import data" },
      { status: 500 }
    );
  }
}
