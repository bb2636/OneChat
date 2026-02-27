import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeUserId = searchParams.get("excludeUserId");

    let users;
    if (excludeUserId) {
      users = await sql`
        SELECT id::text, latitude, longitude, avatar_url, nickname
        FROM users
        WHERE latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND id != ${excludeUserId}::uuid
      `;
    } else {
      users = await sql`
        SELECT id::text, latitude, longitude, avatar_url, nickname
        FROM users
        WHERE latitude IS NOT NULL
          AND longitude IS NOT NULL
      `;
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch user locations:", error);
    return NextResponse.json([], { status: 500 });
  }
}
