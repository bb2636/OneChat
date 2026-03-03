import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: { chatId: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const chatId = params.chatId;
    const userId = auth.userId;

    const chatInfo = await sql`
      SELECT workspace_id, user_id1, user_id2
      FROM chats
      WHERE id = ${chatId}
      LIMIT 1
    `;

    if (!chatInfo.length) {
      return NextResponse.json(
        { error: "채팅방을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const chat = chatInfo[0];
    const isDirectChat = !chat.workspace_id && (chat.user_id1 || chat.user_id2);

    const isMember = await sql`
      SELECT 1
      FROM chat_members
      WHERE chat_id = ${chatId}
        AND user_id = ${userId}
      LIMIT 1
    `;

    if (!isMember.length) {
      if (isDirectChat && (chat.user_id1 === userId || chat.user_id2 === userId)) {
        // 1:1 채팅 참여자 허용
      } else {
        return NextResponse.json(
          { error: "채팅방에 접근할 권한이 없습니다." },
          { status: 403 }
        );
      }
    }

    const members = await sql`
      SELECT
        cm.user_id::text as id,
        cm.role,
        cm.joined_at::text as joined_at,
        u.name,
        u.nickname,
        u.avatar_url,
        EXISTS (
          SELECT 1
          FROM friendships f
          WHERE f.status = 'accepted'
            AND (
              (f.requester_id = ${userId} AND f.addressee_id = cm.user_id)
              OR
              (f.requester_id = cm.user_id AND f.addressee_id = ${userId})
            )
        ) as is_friend
      FROM chat_members cm
      INNER JOIN users u ON u.id = cm.user_id
      WHERE cm.chat_id = ${chatId}
      ORDER BY cm.joined_at ASC
    `;

    if (isDirectChat && members.length === 0) {
      const directChatMembers = await sql`
        SELECT
          u.id::text,
          'member' as role,
          c.created_at::text as joined_at,
          u.name,
          u.nickname,
          u.avatar_url,
          EXISTS (
            SELECT 1
            FROM friendships f
            WHERE f.status = 'accepted'
              AND (
                (f.requester_id = ${userId} AND f.addressee_id = u.id)
                OR
                (f.requester_id = u.id AND f.addressee_id = ${userId})
              )
          ) as is_friend
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
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const chatId = params.chatId;
    const userId = auth.userId;
    const { inviteUserId } = await request.json();

    if (!inviteUserId) {
      return NextResponse.json({ error: "inviteUserId가 필요합니다." }, { status: 400 });
    }

    const chatRows = await sql`
      SELECT member_limit
      FROM chats
      WHERE id = ${chatId}
      LIMIT 1
    `;

    if (!chatRows.length) {
      return NextResponse.json({ error: "채팅방을 찾을 수 없습니다." }, { status: 404 });
    }

    const requestorMember = await sql`
      SELECT 1
      FROM chat_members
      WHERE chat_id = ${chatId}
        AND user_id = ${userId}
      LIMIT 1
    `;

    if (!requestorMember.length) {
      return NextResponse.json({ error: "채팅방 참여자만 초대할 수 있습니다." }, { status: 403 });
    }

    const countRows = await sql`
      SELECT COUNT(*)::int as count
      FROM chat_members
      WHERE chat_id = ${chatId}
    `;

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
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const chatId = params.chatId;
    const userId = auth.userId;
    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId가 필요합니다." }, { status: 400 });
    }

    const requestorMember = await sql`
      SELECT 1
      FROM chat_members
      WHERE chat_id = ${chatId}
        AND user_id = ${userId}
      LIMIT 1
    `;

    if (!requestorMember.length) {
      return NextResponse.json({ error: "채팅방 참여자만 내보내기 할 수 있습니다." }, { status: 403 });
    }

    const deleted = await sql`
      DELETE FROM chat_members
      WHERE chat_id = ${chatId}
        AND user_id = ${targetUserId}
      RETURNING user_id
    `;

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
