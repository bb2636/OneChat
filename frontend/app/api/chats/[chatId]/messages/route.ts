import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { chatId: string } };

export async function GET(request: Request, { params }: Params) {
  const chatId = params.chatId;
  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get("since");

  try {
    // 각 참여자의 마지막 읽은 메시지 ID 가져오기
    const readStatuses = (await sql`
      SELECT 
        user_id::text as user_id,
        COALESCE(last_read_message_id, 0)::bigint as last_read_message_id
      FROM chat_members
      WHERE chat_id = ${chatId}
    `) as unknown as Array<{
      user_id: string;
      last_read_message_id: number;
    }>;

    let messages;
    if (sinceParam && sinceParam.trim()) {
      // 증분 업데이트: since 이후의 메시지만 가져오기
      try {
        // since 파라미터를 Date 객체로 변환하여 유효성 검증
        const sinceDate = new Date(decodeURIComponent(sinceParam));
        if (isNaN(sinceDate.getTime())) {
          // 유효하지 않은 날짜 형식이면 빈 배열 반환
          return NextResponse.json([]);
        }

        messages = (await sql`
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
        `) as unknown as Array<{
          id: number;
          role: string;
          content: string;
          image_url: string | null;
          created_at: string;
          user_id: string | null;
          name: string | null;
          nickname: string | null;
          avatar_url: string | null;
        }>;
      } catch (dateError) {
        // 날짜 파싱 오류 시 빈 배열 반환 (에러 로그만 남기고 계속 진행)
        console.error("Invalid since parameter:", sinceParam, dateError);
        return NextResponse.json([]);
      }
    } else {
      // 전체 메시지 가져오기
      messages = (await sql`
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
      `) as unknown as Array<{
        id: number;
        role: string;
        content: string;
        image_url: string | null;
        created_at: string;
        user_id: string | null;
        name: string | null;
        nickname: string | null;
        avatar_url: string | null;
      }>;
    }

    // 읽음 상태 정보를 메시지와 함께 반환
    return NextResponse.json({
      messages: messages || [],
      readStatuses: readStatuses || [],
    });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error details:", errorMessage);
    // 증분 업데이트 실패 시 빈 배열 반환 (전체 조회 실패 시에만 500 에러)
    const hasSinceParam = sinceParam && sinceParam.trim();
    if (hasSinceParam) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: "메시지를 불러오는데 실패했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const chatId = params.chatId;
    const { userId, content, imageUrl } = (await request.json()) as {
      userId?: string;
      content?: string;
      imageUrl?: string;
    };

    if (!userId || (!content && !imageUrl)) {
      return NextResponse.json({ error: "userId와 content 또는 imageUrl이 필요합니다." }, { status: 400 });
    }

    // Check if user is a member of the chat
    // First check chat_members table (for group chats)
    const memberCheck = (await sql`
      SELECT 1
      FROM chat_members
      WHERE chat_id = ${chatId}
        AND user_id = ${userId}
      LIMIT 1
    `) as unknown as Array<{ "?column?": number }>;

    // If not in chat_members, check if it's a 1:1 chat (user_id1 or user_id2)
    if (!memberCheck.length) {
      const directChatCheck = (await sql`
        SELECT 1
        FROM chats
        WHERE id = ${chatId}
          AND workspace_id IS NULL
          AND (user_id1 = ${userId} OR user_id2 = ${userId})
        LIMIT 1
      `) as unknown as Array<{ "?column?": number }>;

      if (!directChatCheck.length) {
        return NextResponse.json({ error: "채팅방 참여자만 메시지를 보낼 수 있습니다." }, { status: 403 });
      }
    }

    // content와 imageUrl이 모두 없으면 에러
    if (!content?.trim() && !imageUrl) {
      return NextResponse.json({ error: "메시지 내용 또는 이미지가 필요합니다." }, { status: 400 });
    }

    // content가 없고 imageUrl만 있는 경우 빈 문자열 사용
    const messageContent = content?.trim() || '';

    // created_at을 명시적으로 전달
    const createdAt = new Date();
    
    // role에 user_id를 저장 (형식: "user:userId")
    const message = (await sql`
      INSERT INTO messages (chat_id, role, content, image_url, created_at, updated_at)
      VALUES (${chatId}, ${`user:${userId}`}, ${messageContent}, ${imageUrl || null}, ${createdAt}, ${createdAt})
      RETURNING id, role, content, image_url, created_at::text
    `) as unknown as Array<{
      id: number;
      role: string;
      content: string;
      image_url: string | null;
      created_at: string;
    }>;

    // 사용자 정보 가져오기
    const userInfo = (await sql`
      SELECT id, name, nickname, avatar_url
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `) as unknown as Array<{
      id: string;
      name: string | null;
      nickname: string | null;
      avatar_url: string | null;
    }>;

    const user = userInfo[0];

    if (!message.length) {
      return NextResponse.json({ error: "메시지 전송에 실패했습니다." }, { status: 500 });
    }

    // Update chat updated_at
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
    console.error("Error details:", errorMessage);
    return NextResponse.json({ error: `메시지 전송에 실패했습니다: ${errorMessage}` }, { status: 500 });
  }
}
