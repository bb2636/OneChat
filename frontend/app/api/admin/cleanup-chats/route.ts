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

    const dupes = await sql`
      SELECT title, chat_type, COUNT(*)::int as cnt
      FROM chats
      WHERE title IS NOT NULL
      GROUP BY title, chat_type
      HAVING COUNT(*) > 1
    `;

    let deletedCount = 0;

    for (const dupe of dupes) {
      const rows = await sql`
        SELECT id, created_at FROM chats
        WHERE title = ${dupe.title} AND chat_type IS NOT DISTINCT FROM ${dupe.chat_type}
        ORDER BY created_at ASC
      `;

      const toDelete = rows.slice(1);
      for (const row of toDelete) {
        await sql`DELETE FROM messages WHERE chat_id = ${row.id}`;
        await sql`DELETE FROM chat_members WHERE chat_id = ${row.id}`;
        await sql`DELETE FROM chats WHERE id = ${row.id}`;
        deletedCount++;
      }
    }

    const remaining = await sql`SELECT id, title, chat_type FROM chats ORDER BY created_at`;

    return NextResponse.json({ success: true, deletedCount, remaining });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
