import { Avatar, Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Chat } from "@/types";

interface ChatListItemProps {
  chat: Chat;
  onClick?: () => void;
}

// 시간 포맷팅 함수
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    // 오늘: 시간만 표시
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } else if (days === 1) {
    // 어제
    return "어제";
  } else if (days < 7) {
    // 이번 주: 요일
    return date.toLocaleDateString("ko-KR", { weekday: "short" });
  } else if (date.getFullYear() === now.getFullYear()) {
    // 올해: 월일
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    });
  } else {
    // 작년 이전: 년월일
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

export function ChatListItem({ chat, onClick }: ChatListItemProps) {
  const displayTime = chat.last_message_at
    ? formatTime(chat.last_message_at)
    : formatTime(chat.updated_at);

  // 그룹 채팅인지 확인 (participant_count가 2보다 큰 경우)
  const isGroupChat = (chat.participant_count || 0) > 2;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
      )}
    >
      {/* 아바타 영역 */}
      <div className="flex-shrink-0">
        {isGroupChat ? (
          // 그룹 채팅: 여러 아바타 오버랩
          <div className="relative w-12 h-12">
            <div className="absolute top-0 left-0 w-8 h-8 rounded-full bg-gray-300 border-2 border-white" />
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gray-400 border-2 border-white" />
          </div>
        ) : (
          // 1:1 채팅: 단일 아바타
          <Avatar
            src={chat.avatar_url || undefined}
            fallback={chat.title}
            size="lg"
            className="w-12 h-12"
          />
        )}
      </div>

      {/* 채팅 정보 영역 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-medium text-gray-900 truncate">
            {chat.title}
            {isGroupChat && chat.participant_count && (
              <span className="text-gray-500 font-normal ml-1">
                ({chat.participant_count})
              </span>
            )}
          </h3>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {displayTime}
          </span>
        </div>
        <p className="text-sm text-gray-600 truncate">
          {chat.last_message || "메시지가 없습니다"}
        </p>
      </div>

      {/* 읽지 않은 메시지 배지 */}
      {chat.unread_count && chat.unread_count > 0 && (
        <div className="flex-shrink-0">
          <Badge
            variant="default"
            className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center p-0 text-xs font-semibold"
          >
            {chat.unread_count > 99 ? "99+" : chat.unread_count}
          </Badge>
        </div>
      )}
    </div>
  );
}
