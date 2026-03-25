import { NextResponse } from "next/server";
import { clearAuthCookieFromResponse } from "@/lib/auth";

export async function POST() {
  return clearAuthCookieFromResponse(NextResponse.json({ success: true }));
}
