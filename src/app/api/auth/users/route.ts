import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 },
      );
    }

    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const rawPassword = String(password);

    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters" },
        { status: 400 },
      );
    }

    if (rawPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with that email already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12);
    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
    });

    return NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/auth/users error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
