import jwt from "jsonwebtoken";
import { sql } from "@/lib/db";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Please configure the JWT secret.");
  }
  return secret;
}
const TOKEN_EXPIRY = "7d";
const COOKIE_NAME = "onechat_token";
const GOOGLE_SIGNUP_COOKIE = "google_signup_token";

export interface JwtPayload {
  userId: string;
  role: string;
}

export interface GoogleSignupPayload {
  type: "google_signup";
  providerId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function signGoogleSignupToken(payload: Omit<GoogleSignupPayload, "type">): string {
  return jwt.sign({ ...payload, type: "google_signup" }, getJwtSecret(), { expiresIn: "30m" });
}

export function verifyGoogleSignupToken(request: Request): GoogleSignupPayload | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${GOOGLE_SIGNUP_COOKIE}=([^;]+)`));
  if (!match) return null;
  try {
    const decoded = jwt.verify(match[1], getJwtSecret()) as GoogleSignupPayload;
    if (decoded.type !== "google_signup") return null;
    return decoded;
  } catch {
    return null;
  }
}

export function createGoogleSignupCookieHeader(token: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  return `${GOOGLE_SIGNUP_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 60}${isProduction ? "; Secure" : ""}`;
}

export function clearGoogleSignupCookieHeader(): string {
  return `${GOOGLE_SIGNUP_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (match) return match[1];

  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

export function getUserFromRequest(request: Request): JwtPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

export function createTokenCookieHeader(token: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${isProduction ? "; Secure" : ""}`;
}

export function createLogoutCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function requireAuth(request: Request): Promise<{ user: JwtPayload } | { error: string; status: number }> {
  const user = getUserFromRequest(request);
  if (!user) {
    return { error: "인증이 필요합니다.", status: 401 };
  }
  return { user };
}

export async function requireAdmin(request: Request): Promise<{ user: JwtPayload } | { error: string; status: number }> {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult;

  if (authResult.user.role !== "admin") {
    return { error: "관리자 권한이 필요합니다.", status: 403 };
  }

  const rows = await sql`SELECT role FROM users WHERE id = ${authResult.user.userId} LIMIT 1`;
  if (!rows.length || rows[0].role !== "admin") {
    return { error: "관리자 권한이 필요합니다.", status: 403 };
  }

  return authResult;
}
