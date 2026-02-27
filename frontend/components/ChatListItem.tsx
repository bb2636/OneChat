"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Chat } from "@/types";

interface ChatListItemProps {
  chat: Chat;
  onClick?: () => void;
  onLeave?: (chatId: string) => void;
  isLeaveModalOpen?: boolean;
  onResetSwipe?: () => void;
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

export function ChatListItem({ chat, onClick, onLeave, isLeaveModalOpen, onResetSwipe }: ChatListItemProps) {
  const unreadCount = Math.max(0, Number(chat.unread_count || 0));
  const displayTime = chat.last_message_at
    ? formatTime(chat.last_message_at)
    : formatTime(chat.updated_at);

  // 그룹 채팅인지 확인 (participant_count가 2보다 크거나, location_room 타입이거나, 썸네일이 있는 경우)
  const isGroupChat = 
    (chat.participant_count || 0) > 2 || 
    chat.chat_type === 'location_room' || 
    !!chat.thumbnail_url;

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 모달이 닫히면 슬라이드 원복
  useEffect(() => {
    if (!isLeaveModalOpen && swipeOffset > 0) {
      setSwipeOffset(0);
    }
  }, [isLeaveModalOpen, swipeOffset]);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    currentXRef.current = startXRef.current;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    const touch = e.touches[0];
    const diff = startXRef.current - touch.clientX;
    
    // 왼쪽으로 슬라이드하는 경우에만 preventDefault 호출
    if (diff > 0 || swipeOffset > 0) {
      e.preventDefault();
    }
    e.stopPropagation();
    
    currentXRef.current = touch.clientX;
    
    if (diff > 0) {
      // 왼쪽으로 슬라이드 (삭제 버튼 표시)
      const newOffset = Math.min(diff, 80);
      setSwipeOffset(newOffset);
    } else if (swipeOffset > 0) {
      // 오른쪽으로 슬라이드 (원복)
      const newOffset = Math.max(swipeOffset + diff, 0);
      setSwipeOffset(newOffset);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    const finalDiff = startXRef.current - currentXRef.current;
    
    if (finalDiff < 0 && swipeOffset > 0) {
      // 오른쪽으로 슬라이드했고 현재 열려있으면 원복
      setSwipeOffset(0);
    } else if (swipeOffset > 40) {
      // 40px 이상 슬라이드했으면 완전히 열기
      setSwipeOffset(80);
    } else {
      // 그 외에는 닫기
      setSwipeOffset(0);
    }
  };

  const handleLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLeave) {
      onLeave(chat.id);
    }
    // 모달이 열리면 슬라이드는 유지, 모달에서 취소하면 원복됨
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSwipeOffset(0);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative overflow-hidden border-b border-gray-100">
      {/* Delete button - always present but positioned based on swipe */}
      <div
        className="absolute right-0 top-0 h-full w-20 flex items-center justify-center bg-red-500 z-10"
        style={{ 
          transform: `translateX(${80 - swipeOffset}px)`,
          transition: isSwiping ? "none" : "transform 200ms ease-out"
        }}
      >
        <button
          onClick={handleLeave}
          className="flex items-center justify-center w-full h-full text-white"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Chat item */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          // 슬라이드 중이거나 열려있으면 클릭 무시
          if (isSwiping || swipeOffset > 0) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (onClick) onClick();
        }}
        style={{ 
          transform: `translateX(-${swipeOffset}px)`,
          touchAction: isSwiping || swipeOffset > 0 ? "none" : "pan-y"
        }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 bg-white",
          !isSwiping && "transition-transform duration-200 ease-out"
        )}
      >
      {/* 아바타 영역 */}
      <div className="flex-shrink-0">
        {isGroupChat ? (
          // 그룹 채팅: 썸네일이 있으면 썸네일, 없으면 여러 아바타 오버랩
          chat.thumbnail_url ? (
            <img
              src={chat.thumbnail_url}
              alt={chat.title}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="relative w-12 h-12">
              <div className="absolute top-0 left-0 w-8 h-8 rounded-full bg-gray-300 border-2 border-white" />
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gray-400 border-2 border-white" />
            </div>
          )
        ) : (
          // 1:1 채팅: 단일 아바타
          <Avatar
            src={chat.avatar_url || undefined}
            fallback={chat.title}
            size="lg"
            className="w-12 h-12"
            colorSeed={chat.other_user_id || chat.id}
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
      {unreadCount > 0 && (
        <div className="flex-shrink-0">
          <Badge
            variant="default"
            className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center p-0 text-xs font-semibold"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        </div>
      )}
      </div>
    </div>
  );
}
