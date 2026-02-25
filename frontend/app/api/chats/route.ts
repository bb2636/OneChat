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
          COUNT(m.id)::int as message_count,
          (
            SELECT m2.content
            FROM messages m2
            WHERE m2.chat_id = c.id
              AND (m2.is_deleted = false OR m2.is_deleted IS NULL)
            ORDER BY m2.created_at DESC
            LIMIT 1
          ) as last_message,
          (
            SELECT m2.created_at::text
            FROM messages m2
            WHERE m2.chat_id = c.id
              AND (m2.is_deleted = false OR m2.is_deleted IS NULL)
            ORDER BY m2.created_at DESC
            LIMIT 1
          ) as last_message_at,
          0 as unread_count
        FROM chats c
        LEFT JOIN messages m ON m.chat_id = c.id
        WHERE c.workspace_id = ${workspaceId}
        GROUP BY c.id, c.title, c.pinned, c.created_at, c.updated_at
        ORDER BY c.pinned DESC, c.updated_at DESC
      `;
    } else if (userId) {
      // 사용자가 참여한 채팅방 (chat_members 포함)
      // 나간 채팅방은 제외: chat_members에 사용자가 있거나, 1:1 채팅인 경우 user_id1/user_id2에 사용자가 있어야 함
      result = await sql`
        SELECT DISTINCT
          c.id,
          c.title,
          c.pinned,
          c.created_at,
          c.updated_at,
          COUNT(m.id)::int as message_count,
          (
            SELECT m2.content
            FROM messages m2
            WHERE m2.chat_id = c.id
              AND (m2.is_deleted = false OR m2.is_deleted IS NULL)
            ORDER BY m2.created_at DESC
            LIMIT 1
          ) as last_message,
          (
            SELECT m2.created_at::text
            FROM messages m2
            WHERE m2.chat_id = c.id
              AND (m2.is_deleted = false OR m2.is_deleted IS NULL)
            ORDER BY m2.created_at DESC
            LIMIT 1
          ) as last_message_at,
          0 as unread_count,
          CASE 
            WHEN c.user_id1 = ${userId} THEN c.user_id2
            ELSE c.user_id1
          END as other_user_id,
          (
            SELECT COUNT(*)::int
            FROM chat_members cm
            WHERE cm.chat_id = c.id
          ) as participant_count,
          c.thumbnail_url,
          c.chat_type
        FROM chats c
        LEFT JOIN messages m ON m.chat_id = c.id
        WHERE c.workspace_id IS NULL
          AND (
            -- chat_members에 사용자가 있는 경우 (그룹 채팅 또는 멤버가 있는 1:1 채팅)
            EXISTS (
              SELECT 1
              FROM chat_members cm
              WHERE cm.chat_id = c.id
                AND cm.user_id = ${userId}
            )
            OR
            -- 1:1 채팅이고 chat_members에 아무도 없고 user_id1 또는 user_id2에 사용자가 있는 경우 (기존 1:1 채팅)
            (
              (c.user_id1 = ${userId} OR c.user_id2 = ${userId})
              AND NOT EXISTS (
                SELECT 1
                FROM chat_members cm2
                WHERE cm2.chat_id = c.id
              )
              -- 사용자가 나간 1:1 채팅은 제외: chat_members에 다른 사람이 있으면 제외
              AND NOT EXISTS (
                SELECT 1
                FROM chat_members cm3
                WHERE cm3.chat_id = c.id
                  AND cm3.user_id != ${userId}
              )
            )
          )
        GROUP BY c.id, c.title, c.pinned, c.created_at, c.updated_at, c.user_id1, c.user_id2, c.thumbnail_url, c.chat_type
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
          COUNT(m.id)::int as message_count,
          (
            SELECT m2.content
            FROM messages m2
            WHERE m2.chat_id = c.id
              AND (m2.is_deleted = false OR m2.is_deleted IS NULL)
            ORDER BY m2.created_at DESC
            LIMIT 1
          ) as last_message,
          (
            SELECT m2.created_at::text
            FROM messages m2
            WHERE m2.chat_id = c.id
              AND (m2.is_deleted = false OR m2.is_deleted IS NULL)
            ORDER BY m2.created_at DESC
            LIMIT 1
          ) as last_message_at,
          0 as unread_count
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
