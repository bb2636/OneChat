export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  chat_count: number;
}

export interface Chat {
  id: string;
  title: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  message_count: number;
  other_user_id?: string;
  last_message?: string; // 최신 메시지 내용
  last_message_at?: string; // 최신 메시지 시간
  unread_count?: number; // 읽지 않은 메시지 수
  participant_count?: number; // 참여자 수 (그룹 채팅)
  avatar_url?: string | null; // 채팅 아바타
  thumbnail_url?: string | null; // 채팅방 썸네일
  chat_type?: string | null; // 채팅 유형 (location_room 등)
}

export interface Friend {
  id: string;
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
  status: string;
  friendship_created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  image_url: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}
