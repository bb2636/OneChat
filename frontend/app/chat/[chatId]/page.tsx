import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { ChatRoomClient } from "@/components/ChatRoomClient";

export const dynamic = "force-dynamic";

type ChatRow = {
  id: string;
  title: string;
  created_at: string;
};

type MessageRow = {
  id: number;
  role: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

export default async function ChatRoomPage({
  params,
}: {
  params: { chatId: string };
}) {
  const chatId = params.chatId;

  const chatRows = (await sql`
    SELECT id, title, created_at::text as created_at, user_id1, user_id2
    FROM chats
    WHERE id = ${chatId}
    LIMIT 1
  `) as unknown as Array<ChatRow & { user_id1: string | null; user_id2: string | null }>;

  if (!chatRows.length) notFound();
  const chat = chatRows[0];
  
  // 접근 권한 체크는 클라이언트 사이드(ChatRoomClient)와 API에서 수행

  const messages = (await sql`
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
  `) as unknown as Array<MessageRow & {
    user_id: string | null;
    name: string | null;
    nickname: string | null;
    avatar_url: string | null;
  }>;

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

  return <ChatRoomClient chatId={chat.id} chatTitle={chat.title} initialMessages={messages} chatCreatedAt={chat.created_at} initialReadStatuses={readStatuses} />;
}

