import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// 빌드 시점에 데이터베이스 연결을 시도하지 않도록 동적 렌더링 설정
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
