import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import { DEFAULT_CATEGORIES } from "@/lib/utils";

export async function GET() {
  try {
    await connectToDatabase();
    let categories = await Category.find().sort({ type: 1, name: 1 }).lean();

    if (categories.length === 0) {
      const defaults = DEFAULT_CATEGORIES.map((c) => ({
        ...c,
        isDefault: true,
      }));
      await Category.insertMany(defaults);
      categories = await Category.find().sort({ type: 1, name: 1 }).lean();
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const category = await Category.create(body);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
