import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    const result = await sql`
      SELECT 
        w.id,
        w.name,
        w.created_at,
        COUNT(c.id)::int as chat_count
      FROM workspaces w
      LEFT JOIN chats c ON c.workspace_id = w.id
      GROUP BY w.id, w.name, w.created_at
      ORDER BY w.created_at DESC
    `;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}
