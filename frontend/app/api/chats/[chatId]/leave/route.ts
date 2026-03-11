import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: { chatId: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const chatId = params.chatId;
    const userId = auth.userId;

    const memberCheck = await sql`
      SELECT 1
      FROM chat_members
      WHERE chat_id = ${chatId}
        AND user_id = ${userId}
      LIMIT 1
    `;

    let isDirectChat = false;
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
      isDirectChat = true;
    }

    const userInfo = await sql`
      SELECT name, nickname
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    const userName = userInfo[0]?.name || userInfo[0]?.nickname || "사용자";

    if (isDirectChat) {
      await sql`
        DELETE FROM messages
        WHERE chat_id = ${chatId}
      `;
      await sql`
        DELETE FROM chats
        WHERE id = ${chatId}
      `;
    } else {
      await sql`
        DELETE FROM chat_members
        WHERE chat_id = ${chatId}
          AND user_id = ${userId}
      `;

      const remainingMembers = await sql`
        SELECT COUNT(*)::int as count
        FROM chat_members
        WHERE chat_id = ${chatId}
      `;

      if (remainingMembers[0].count === 0) {
        await sql`
          DELETE FROM messages
          WHERE chat_id = ${chatId}
        `;
        await sql`
          DELETE FROM chats
          WHERE id = ${chatId}
        `;
      } else {
        await sql`
          INSERT INTO messages (chat_id, role, content, created_at)
          VALUES (${chatId}, 'system', ${`${userName}님이 퇴장하셨습니다.`}, ${new Date()})
        `;

        await sql`
          UPDATE chats
          SET updated_at = ${new Date()}
          WHERE id = ${chatId}
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to leave chat:", error);
    return NextResponse.json({ error: "채팅방 나가기에 실패했습니다." }, { status: 500 });
  }
}
