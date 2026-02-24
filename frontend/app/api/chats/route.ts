import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const userId = searchParams.get("userId");

    let result;

    if (workspaceId) {
      // 워크스페이스 채팅
      result = await sql`
        SELECT 
          c.id,
          c.title,
          c.pinned,
          c.created_at,
          c.updated_at,
          COUNT(m.id)::int as message_count
        FROM chats c
        LEFT JOIN messages m ON m.chat_id = c.id
        WHERE c.workspace_id = ${workspaceId}
        GROUP BY c.id, c.title, c.pinned, c.created_at, c.updated_at
        ORDER BY c.pinned DESC, c.updated_at DESC
      `;
    } else if (userId) {
      // 1:1 채팅
      result = await sql`
        SELECT 
          c.id,
          c.title,
          c.pinned,
          c.created_at,
          c.updated_at,
          COUNT(m.id)::int as message_count,
          CASE 
            WHEN c.user_id1 = ${userId} THEN c.user_id2
            ELSE c.user_id1
          END as other_user_id
        FROM chats c
        LEFT JOIN messages m ON m.chat_id = c.id
        WHERE (c.user_id1 = ${userId} OR c.user_id2 = ${userId})
          AND c.workspace_id IS NULL
        GROUP BY c.id, c.title, c.pinned, c.created_at, c.updated_at, c.user_id1, c.user_id2
        ORDER BY c.pinned DESC, c.updated_at DESC
      `;
    } else {
      result = await sql`
        SELECT 
          c.id,
          c.title,
          c.pinned,
          c.created_at,
          c.updated_at,
          COUNT(m.id)::int as message_count
        FROM chats c
        LEFT JOIN messages m ON m.chat_id = c.id
        GROUP BY c.id, c.title, c.pinned, c.created_at, c.updated_at
        ORDER BY c.pinned DESC, c.updated_at DESC
        LIMIT 50
      `;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, targetUserId } = await request.json();

    if (!userId || !targetUserId) {
      return NextResponse.json(
        { error: "userId와 targetUserId가 필요합니다." },
        { status: 400 }
      );
    }

    if (userId === targetUserId) {
      return NextResponse.json(
        { error: "자기 자신과 채팅방을 생성할 수 없습니다." },
        { status: 400 }
      );
    }

    const existingChat = (await sql`
      SELECT id, title, pinned, created_at, updated_at
      FROM chats
      WHERE workspace_id IS NULL
        AND (
          (user_id1 = ${userId} AND user_id2 = ${targetUserId})
          OR
          (user_id1 = ${targetUserId} AND user_id2 = ${userId})
        )
      LIMIT 1
    `) as unknown as Array<{
      id: string;
      title: string;
      pinned: boolean;
      created_at: string;
      updated_at: string;
    }>;

    if (existingChat.length > 0) {
      return NextResponse.json({
        success: true,
        chat: existingChat[0],
        existed: true,
      });
    }

    const created = (await sql`
      INSERT INTO chats (id, workspace_id, user_id1, user_id2, title, pinned, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        NULL,
        ${userId},
        ${targetUserId},
        ${"1:1 채팅"},
        false,
        ${new Date()},
        ${new Date()}
      )
      RETURNING id, title, pinned, created_at, updated_at
    `) as unknown as Array<{
      id: string;
      title: string;
      pinned: boolean;
      created_at: string;
      updated_at: string;
    }>;

    return NextResponse.json(
      {
        success: true,
        chat: created[0],
        existed: false,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create chat:", error);
    return NextResponse.json(
      { error: "채팅방 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
