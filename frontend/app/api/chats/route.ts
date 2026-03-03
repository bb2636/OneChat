import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const userId = auth.userId;

    let result;

    if (workspaceId) {
      result = await sql`
        SELECT 
          c.id,
          c.title,
          c.pinned,
          c.created_at,
          c.updated_at,
          COUNT(m.id)::int as message_count,
          last_msg.content as last_message,
          last_msg.created_at::text as last_message_at,
          0 as unread_count
        FROM chats c
        LEFT JOIN messages m ON m.chat_id = c.id
        LEFT JOIN LATERAL (
          SELECT m2.content, m2.created_at
          FROM messages m2
          WHERE m2.chat_id = c.id
            AND (m2.is_deleted = false OR m2.is_deleted IS NULL)
          ORDER BY m2.created_at DESC
          LIMIT 1
        ) last_msg ON true
        WHERE c.workspace_id = ${workspaceId}
        GROUP BY c.id, c.title, c.pinned, c.created_at, c.updated_at, last_msg.content, last_msg.created_at
        ORDER BY c.pinned DESC, c.updated_at DESC
      `;
    } else {
      result = await sql`
        SELECT DISTINCT
          c.id,
          c.title,
          c.pinned,
          c.created_at,
          c.updated_at,
          COUNT(m.id)::int as message_count,
          last_msg.content as last_message,
          last_msg.created_at::text as last_message_at,
          COALESCE(unread.cnt, 0)::int as unread_count,
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
        LEFT JOIN LATERAL (
          SELECT m2.content, m2.created_at
          FROM messages m2
          WHERE m2.chat_id = c.id
            AND (m2.is_deleted = false OR m2.is_deleted IS NULL)
          ORDER BY m2.created_at DESC
          LIMIT 1
        ) last_msg ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int as cnt
          FROM messages um
          WHERE um.chat_id = c.id
            AND (um.is_deleted = false OR um.is_deleted IS NULL)
            AND um.role != ${'user:' + userId}
            AND um.id > COALESCE(
              (SELECT cm2.last_read_message_id FROM chat_members cm2 WHERE cm2.chat_id = c.id AND cm2.user_id = ${userId} LIMIT 1),
              0
            )
        ) unread ON true
        WHERE c.workspace_id IS NULL
          AND (
            EXISTS (
              SELECT 1
              FROM chat_members cm
              WHERE cm.chat_id = c.id
                AND cm.user_id = ${userId}
            )
            OR
            (
              c.chat_type IS NULL
              AND (c.user_id1 = ${userId} OR c.user_id2 = ${userId})
            )
          )
        GROUP BY c.id, c.title, c.pinned, c.created_at, c.updated_at, c.user_id1, c.user_id2, c.thumbnail_url, c.chat_type, last_msg.content, last_msg.created_at, unread.cnt
        ORDER BY c.pinned DESC, c.updated_at DESC
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
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { targetUserId } = await request.json();
    const userId = auth.userId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "targetUserId가 필요합니다." },
        { status: 400 }
      );
    }

    if (userId === targetUserId) {
      return NextResponse.json(
        { error: "자기 자신과 채팅방을 생성할 수 없습니다." },
        { status: 400 }
      );
    }

    const existingChat = await sql`
      SELECT id, title, pinned, created_at, updated_at
      FROM chats
      WHERE workspace_id IS NULL
        AND (
          (user_id1 = ${userId} AND user_id2 = ${targetUserId})
          OR
          (user_id1 = ${targetUserId} AND user_id2 = ${userId})
        )
      LIMIT 1
    `;

    if (existingChat.length > 0) {
      return NextResponse.json({
        success: true,
        chat: existingChat[0],
        existed: true,
      });
    }

    const created = await sql`
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
    `;

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
