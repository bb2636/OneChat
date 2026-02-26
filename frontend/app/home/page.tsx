import { MainPage } from "@/components/MainPage";
import type { Chat } from "@/types";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getChatsForUser(userId: string): Promise<Chat[]> {
  try {
    const result = await sql`
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
          -- 그룹/위치 기반 및 멤버가 있는 채팅방: chat_members에 사용자가 있는 경우만 포함
          EXISTS (
            SELECT 1
            FROM chat_members cm
            WHERE cm.chat_id = c.id
              AND cm.user_id = ${userId}
          )
          OR
          -- 1:1 채팅: chat_type 이 NULL 이고 user_id1 또는 user_id2 에 사용자가 있는 경우 포함
          (
            c.chat_type IS NULL
            AND (c.user_id1 = ${userId} OR c.user_id2 = ${userId})
          )
        )
      GROUP BY c.id, c.title, c.pinned, c.created_at, c.updated_at, c.user_id1, c.user_id2, c.thumbnail_url, c.chat_type
      ORDER BY c.pinned DESC, c.updated_at DESC
    `;
    return result as unknown as Chat[];
  } catch (error) {
    console.error("Failed to fetch chats for user:", error);
    return [];
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { userId?: string };
}) {
  const userId = searchParams.userId;

  // 쿼리 파라미터에 userId가 있으면 서버에서 채팅 목록을 미리 가져와 SSR
  // (로그인/구글 로그인 후 리다이렉트 시 사용)
  // 직접 /home 으로 접속한 경우에는 빈 배열로 두고 클라이언트에서 다시 로딩
  const chats: Chat[] = userId ? await getChatsForUser(userId) : [];

  return <MainPage initialChats={chats} />;
}
