import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "budget-app-secret-change-me";
const COOKIE_NAME = "budget-auth";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export function signToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: MAX_AGE });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Get the current session user from the auth cookie.
 * Returns null if not authenticated.
 * Use in API routes (server-side).
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Get userId string from session, or null.
 * Convenience for API routes.
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.id ?? null;
}

/**
 * Set the auth cookie after successful login.
 */
export async function setAuthCookie(user: SessionUser): Promise<void> {
  const token = signToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

/**
 * Clear the auth cookie (logout).
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function attachAuthCookie(
  response: NextResponse,
  user: SessionUser,
): NextResponse {
  response.cookies.set(COOKIE_NAME, signToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return response;
}

export function clearAuthCookieFromResponse(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

/**
 * Verify token from a raw string (for middleware, which can't use next/headers cookies()).
 */
export function verifyTokenString(token: string): SessionUser | null {
  return verifyToken(token);
}

export { COOKIE_NAME };
