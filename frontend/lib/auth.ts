import jwt from "jsonwebtoken";
import { sql } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Please configure the JWT secret.");
}
const TOKEN_EXPIRY = "7d";
const COOKIE_NAME = "onechat_token";

export interface JwtPayload {
  userId: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
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
