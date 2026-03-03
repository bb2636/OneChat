import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (key !== process.env.SEED_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { oldUsername, newUsername, newEmail } = await request.json();

    const result = await sql`
      UPDATE users 
      SET username = ${newUsername}, email = ${newEmail || newUsername}
      WHERE username = ${oldUsername}
      RETURNING id, username, email, nickname
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: result[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
