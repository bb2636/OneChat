import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: { chatId: string } };

export async function GET(request: Request, { params }: Params) {
  const chatId = params.chatId;
  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get("since");

  try {
    const readStatuses = await sql`
      SELECT 
        user_id::text as user_id,
        COALESCE(last_read_message_id, 0)::bigint as last_read_message_id
      FROM chat_members
      WHERE chat_id = ${chatId}
    `;

    let messages;
    if (sinceParam && sinceParam.trim()) {
      const sinceDate = new Date(decodeURIComponent(sinceParam));
      if (isNaN(sinceDate.getTime())) {
        return NextResponse.json([]);
      }

      messages = await sql`
        SELECT 
          m.id, 
          m.role, 
          m.content, 
          m.image_url, 
          m.created_at::text,
          CASE 
            WHEN m.role LIKE 'user:%' THEN SPLIT_PART(m.role, ':', 2)::uuid
            ELSE NULL
          END as user_id,
          u.name,
          u.nickname,
          u.avatar_url
        FROM messages m
        LEFT JOIN users u ON CASE 
          WHEN m.role LIKE 'user:%' THEN u.id = SPLIT_PART(m.role, ':', 2)::uuid
          ELSE false
        END
        WHERE m.chat_id = ${chatId}
          AND (m.is_deleted = false OR m.is_deleted IS NULL)
          AND m.created_at > ${sinceDate}::timestamptz
        ORDER BY m.created_at ASC
      `;
    } else {
      messages = await sql`
        SELECT 
          m.id, 
          m.role, 
          m.content, 
          m.image_url, 
          m.created_at::text,
          CASE 
            WHEN m.role LIKE 'user:%' THEN SPLIT_PART(m.role, ':', 2)::uuid
            ELSE NULL
          END as user_id,
          u.name,
          u.nickname,
          u.avatar_url
        FROM messages m
        LEFT JOIN users u ON CASE 
          WHEN m.role LIKE 'user:%' THEN u.id = SPLIT_PART(m.role, ':', 2)::uuid
          ELSE false
        END
        WHERE m.chat_id = ${chatId}
          AND (m.is_deleted = false OR m.is_deleted IS NULL)
        ORDER BY m.created_at ASC
      `;
    }

    return NextResponse.json({
      messages: messages || [],
      readStatuses: readStatuses || [],
    });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    const hasSinceParam = sinceParam && sinceParam.trim();
    if (hasSinceParam) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: "메시지를 불러오는데 실패했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const chatId = params.chatId;
    const userId = auth.userId;
    const { content, imageUrl } = await request.json();

    if (!content && !imageUrl) {
      return NextResponse.json({ error: "content 또는 imageUrl이 필요합니다." }, { status: 400 });
    }

    const memberCheck = await sql`
      SELECT 1
      FROM chat_members
      WHERE chat_id = ${chatId}
        AND user_id = ${userId}
      LIMIT 1
    `;

    if (!memberCheck.length) {
      const directChatCheck = await sql`
        SELECT 1
        FROM chats
        WHERE id = ${chatId}
          AND workspace_id IS NULL
          AND (user_id1 = ${userId} OR user_id2 = ${userId})
        LIMIT 1
      `;

      if (!directChatCheck.length) {
        return NextResponse.json({ error: "채팅방 참여자만 메시지를 보낼 수 있습니다." }, { status: 403 });
      }
    }

    if (!content?.trim() && !imageUrl) {
      return NextResponse.json({ error: "메시지 내용 또는 이미지가 필요합니다." }, { status: 400 });
    }

    const messageContent = content?.trim() || '';
    const createdAt = new Date();
    
    const message = await sql`
      INSERT INTO messages (chat_id, role, content, image_url, created_at, updated_at)
      VALUES (${chatId}, ${`user:${userId}`}, ${messageContent}, ${imageUrl || null}, ${createdAt}, ${createdAt})
      RETURNING id, role, content, image_url, created_at::text
    `;

    const userInfo = await sql`
      SELECT id, name, nickname, avatar_url
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    const user = userInfo[0];

    if (!message.length) {
      return NextResponse.json({ error: "메시지 전송에 실패했습니다." }, { status: 500 });
    }

    await sql`
      UPDATE chats
      SET updated_at = ${new Date()}
      WHERE id = ${chatId}
    `;

    return NextResponse.json({ 
      message: {
        ...message[0],
        user_id: user?.id || null,
        name: user?.name || null,
        nickname: user?.nickname || null,
        avatar_url: user?.avatar_url || null,
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to send message:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `메시지 전송에 실패했습니다: ${errorMessage}` }, { status: 500 });
  }
}
