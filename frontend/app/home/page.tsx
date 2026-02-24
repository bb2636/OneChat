import { sql } from "@/lib/db";
import { MainPage } from "@/components/MainPage";
import type { Chat } from "@/types";

// 빌드 시점에 데이터베이스 연결을 시도하지 않도록 동적 렌더링 설정
export const dynamic = 'force-dynamic';

// 서버 컴포넌트에서 초기 데이터 fetch
async function getChats(): Promise<Chat[]> {
  try {
    const result = await sql`
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
      LEFT JOIN messages m ON m.chat_id = c.id AND (m.is_deleted = false OR m.is_deleted IS NULL)
      GROUP BY c.id, c.title, c.pinned, c.created_at, c.updated_at
      ORDER BY c.pinned DESC, c.updated_at DESC
      LIMIT 50
    `;
    return result as unknown as Chat[];
  } catch (error) {
    console.error("Failed to fetch chats:", error);
    // 에러 발생 시 빈 배열 반환
    return [];
  }
}

export default async function HomePage() {
  // 서버 컴포넌트에서 데이터 fetch
  const chats = await getChats();

  return <MainPage initialChats={chats} />;
}
