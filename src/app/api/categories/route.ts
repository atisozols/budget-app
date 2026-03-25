import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import { getUserId } from "@/lib/auth";
import { DEFAULT_CATEGORIES } from "@/lib/utils";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    let categories = await Category.find({ userId })
      .sort({ type: 1, name: 1 })
      .lean();

    if (categories.length === 0) {
      const defaults = DEFAULT_CATEGORIES.map((c) => ({
        ...c,
        userId,
        isDefault: true,
      }));
      await Category.insertMany(defaults);
      categories = await Category.find({ userId })
        .sort({ type: 1, name: 1 })
        .lean();
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
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = { ...(await request.json()) } as Record<string, unknown>;
    delete body._id;
    delete body.userId;
    const category = await Category.create({ ...body, userId });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
