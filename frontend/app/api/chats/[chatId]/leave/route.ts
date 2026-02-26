import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { chatId: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    const chatId = params.chatId;
    const { userId } = (await request.json()) as {
      userId?: string;
    };

    if (!userId) {
      return NextResponse.json({ error: "userId가 필요합니다." }, { status: 400 });
    }

    // Check if user is a member (chat_members or 1:1 chat)
    const memberCheck = (await sql`
      SELECT 1
      FROM chat_members
      WHERE chat_id = ${chatId}
        AND user_id = ${userId}
      LIMIT 1
    `) as unknown as Array<{ "?column?": number }>;

    // If not in chat_members, check if it's a 1:1 chat
    let isDirectChat = false;
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
        return NextResponse.json({ error: "채팅방 참여자가 아닙니다." }, { status: 403 });
      }
      isDirectChat = true;
    }

    // Get user info before removing
    const userInfo = (await sql`
      SELECT name, nickname
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `) as unknown as Array<{ name: string | null; nickname: string | null }>;

    const userName = userInfo[0]?.name || userInfo[0]?.nickname || "사용자";

    if (isDirectChat) {
      // 1:1 채팅: 채팅방 자체를 삭제
      await sql`
        DELETE FROM messages
        WHERE chat_id = ${chatId}
      `;
      await sql`
        DELETE FROM chats
        WHERE id = ${chatId}
      `;
    } else {
      // 그룹 채팅: chat_members에서 제거
      await sql`
        DELETE FROM chat_members
        WHERE chat_id = ${chatId}
          AND user_id = ${userId}
      `;

      // Check if there are any remaining members
      const remainingMembers = (await sql`
        SELECT COUNT(*)::int as count
        FROM chat_members
        WHERE chat_id = ${chatId}
      `) as unknown as Array<{ count: number }>;

      // If no members left, delete the chat and all messages
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
        // Create system message for user leaving
        await sql`
          INSERT INTO messages (chat_id, role, content, created_at)
          VALUES (${chatId}, 'system', ${`${userName}님이 퇴장하셨습니다.`}, ${new Date()})
        `;

        // Update chat updated_at
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
