import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ user: null });
  }

  try {
    const users = await sql`
      SELECT id, username, nickname, email, name, avatar_url, role
      FROM users
      WHERE id = ${payload.userId}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: users[0] });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ user: null });
  }
}
