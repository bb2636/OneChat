import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { chatId: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    const chatId = params.chatId;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // 채팅방 정보 가져오기
    const chatInfo = (await sql`
      SELECT workspace_id, user_id1, user_id2
      FROM chats
      WHERE id = ${chatId}
      LIMIT 1
    `) as unknown as Array<{
      workspace_id: string | null;
      user_id1: string | null;
      user_id2: string | null;
    }>;

    if (!chatInfo.length) {
      return NextResponse.json(
        { error: "채팅방을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const chat = chatInfo[0];
    const isDirectChat = !chat.workspace_id && (chat.user_id1 || chat.user_id2);

    // userId가 제공되면 접근 권한 체크
    if (userId) {
      // chat_members에 사용자가 있는지 확인
      const isMember = (await sql`
        SELECT 1
        FROM chat_members
        WHERE chat_id = ${chatId}
          AND user_id = ${userId}
        LIMIT 1
      `) as unknown as Array<{ "?column?": number }>;

      // chat_members에 없으면 1:1 채팅인지 확인
      if (!isMember.length) {
        if (isDirectChat && (chat.user_id1 === userId || chat.user_id2 === userId)) {
          // 1:1 채팅이고 사용자가 참여자인 경우 허용
          // chat_members가 비어있을 수 있으므로 빈 배열 반환
        } else {
          // 멤버가 아니면 접근 거부
          return NextResponse.json(
            { error: "채팅방에 접근할 권한이 없습니다." },
            { status: 403 }
          );
        }
      }
    }

    // chat_members에서 멤버 조회
    const members = await sql`
      SELECT
        cm.user_id::text as id,
        cm.role,
        cm.joined_at::text as joined_at,
        u.name,
        u.nickname,
        u.avatar_url,
        ${
          userId
            ? sql`EXISTS (
                SELECT 1
                FROM friendships f
                WHERE f.status = 'accepted'
                  AND (
                    (f.requester_id = ${userId} AND f.addressee_id = cm.user_id)
                    OR
                    (f.requester_id = cm.user_id AND f.addressee_id = ${userId})
                  )
              )`
            : sql`false`
        } as is_friend
      FROM chat_members cm
      INNER JOIN users u ON u.id = cm.user_id
      WHERE cm.chat_id = ${chatId}
      ORDER BY cm.joined_at ASC
    `;

    // 1:1 채팅이고 chat_members가 비어있는 경우, user_id1과 user_id2를 멤버로 반환
    if (isDirectChat && members.length === 0 && userId) {
      const directChatMembers = await sql`
        SELECT
          u.id::text,
          'member' as role,
          c.created_at::text as joined_at,
          u.name,
          u.nickname,
          u.avatar_url,
          ${
            userId
              ? sql`EXISTS (
                  SELECT 1
                  FROM friendships f
                  WHERE f.status = 'accepted'
                    AND (
                      (f.requester_id = ${userId} AND f.addressee_id = u.id)
                      OR
                      (f.requester_id = u.id AND f.addressee_id = ${userId})
                    )
                  )`
              : sql`false`
          } as is_friend
        FROM chats c
        INNER JOIN users u ON (u.id = c.user_id1 OR u.id = c.user_id2)
        WHERE c.id = ${chatId}
          AND u.id != ${userId}
        LIMIT 1
      `;
      
      return NextResponse.json(directChatMembers);
    }

    return NextResponse.json(members);
  } catch (error) {
    console.error("Failed to fetch chat members:", error);
    return NextResponse.json({ error: "채팅방 참여자 조회에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const chatId = params.chatId;
    const { userId, inviteUserId } = (await request.json()) as {
      userId?: string;
      inviteUserId?: string;
    };

    if (!userId || !inviteUserId) {
      return NextResponse.json({ error: "userId와 inviteUserId가 필요합니다." }, { status: 400 });
    }

    const chatRows = (await sql`
      SELECT member_limit
      FROM chats
      WHERE id = ${chatId}
      LIMIT 1
    `) as unknown as Array<{ member_limit: number | null }>;

    if (!chatRows.length) {
      return NextResponse.json({ error: "채팅방을 찾을 수 없습니다." }, { status: 404 });
    }

    const requestorMember = (await sql`
      SELECT 1
      FROM chat_members
      WHERE chat_id = ${chatId}
        AND user_id = ${userId}
      LIMIT 1
    `) as unknown as Array<{ "?column?": number }>;

    if (!requestorMember.length) {
      return NextResponse.json({ error: "채팅방 참여자만 초대할 수 있습니다." }, { status: 403 });
    }

    const countRows = (await sql`
      SELECT COUNT(*)::int as count
      FROM chat_members
      WHERE chat_id = ${chatId}
    `) as unknown as Array<{ count: number }>;

    const memberLimit = Math.max(2, Number(chatRows[0].member_limit || 2));
    if (countRows[0].count >= memberLimit) {
      return NextResponse.json({ error: `인원 제한(${memberLimit}명)에 도달했습니다.` }, { status: 400 });
    }

    await sql`
      INSERT INTO chat_members (chat_id, user_id, role)
      VALUES (${chatId}, ${inviteUserId}, 'member')
      ON CONFLICT (chat_id, user_id) DO NOTHING
    `;

    await sql`
      UPDATE chats
      SET updated_at = ${new Date()}
      WHERE id = ${chatId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to invite chat member:", error);
    return NextResponse.json({ error: "채팅방 초대에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const chatId = params.chatId;
    const { userId, targetUserId } = (await request.json()) as {
      userId?: string;
      targetUserId?: string;
    };

    if (!userId || !targetUserId) {
      return NextResponse.json({ error: "userId와 targetUserId가 필요합니다." }, { status: 400 });
    }

    const requestorMember = (await sql`
      SELECT 1
      FROM chat_members
      WHERE chat_id = ${chatId}
        AND user_id = ${userId}
      LIMIT 1
    `) as unknown as Array<{ "?column?": number }>;

    if (!requestorMember.length) {
      return NextResponse.json({ error: "채팅방 참여자만 내보내기 할 수 있습니다." }, { status: 403 });
    }

    const deleted = (await sql`
      DELETE FROM chat_members
      WHERE chat_id = ${chatId}
        AND user_id = ${targetUserId}
      RETURNING user_id
    `) as unknown as Array<{ user_id: string }>;

    if (!deleted.length) {
      return NextResponse.json({ error: "삭제할 참여자를 찾을 수 없습니다." }, { status: 404 });
    }

    await sql`
      UPDATE chats
      SET updated_at = ${new Date()}
      WHERE id = ${chatId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove chat member:", error);
    return NextResponse.json({ error: "채팅방 참여자 삭제에 실패했습니다." }, { status: 500 });
  }
}

