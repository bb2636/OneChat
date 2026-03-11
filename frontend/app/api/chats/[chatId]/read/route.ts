import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: { chatId: string } };

export async function PUT(request: Request, { params }: Params) {
  try {
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const chatId = params.chatId;
    const userId = auth.userId;
    const { messageId } = await request.json();

    if (messageId === undefined || messageId === null) {
      return NextResponse.json({ error: "messageId가 필요합니다." }, { status: 400 });
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
        return NextResponse.json({ error: "채팅방 참여자가 아닙니다." }, { status: 403 });
      }

      await sql`
        INSERT INTO chat_members (chat_id, user_id, role, last_read_message_id)
        VALUES (${chatId}, ${userId}, 'member', ${messageId})
        ON CONFLICT (chat_id, user_id) 
        DO UPDATE SET last_read_message_id = GREATEST(chat_members.last_read_message_id, ${messageId})
      `;
    } else {
      await sql`
        UPDATE chat_members
        SET last_read_message_id = GREATEST(COALESCE(last_read_message_id, 0), ${messageId})
        WHERE chat_id = ${chatId}
          AND user_id = ${userId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update read status:", error);
    return NextResponse.json({ error: "읽음 상태 업데이트에 실패했습니다." }, { status: 500 });
  }
}
