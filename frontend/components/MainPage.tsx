"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChatListItem } from "@/components/ChatListItem";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Skeleton } from "@/components/ui";
import type { Chat } from "@/types";

interface MainPageProps {
  initialChats: Chat[];
}

export function MainPage({ initialChats }: MainPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"map" | "chat" | "friends" | "mypage">(
    "chat"
  );

  // React Query로 데이터 관리 (캐싱 및 업데이트)
  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const res = await fetch("/api/chats");
      if (!res.ok) throw new Error("Failed to fetch chats");
      return res.json() as Promise<Chat[]>;
    },
    initialData: initialChats,
    staleTime: 2 * 60 * 1000, // 2분간 fresh 상태 유지
    gcTime: 10 * 60 * 1000,
    refetchInterval: 30 * 1000, // 30초마다 백그라운드 업데이트
  });

  const renderContent = () => {
    switch (activeTab) {
      case "chat":
        if (chatsLoading) {
          return (
            <div className="space-y-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-none" />
              ))}
            </div>
          );
        }

        if (!chats || chats.length === 0) {
          return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
              <p className="text-gray-400 text-center">
                새로운 메시지가 없습니다.
              </p>
            </div>
          );
        }

        return (
          <div className="bg-white">
            {chats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                onClick={() => {
                  // 채팅 상세 페이지로 이동
                  console.log("Chat clicked:", chat.id);
                }}
              />
            ))}
          </div>
        );

      case "friends":
        return (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <p className="text-gray-400">친구 목록 준비 중...</p>
          </div>
        );

      case "mypage":
        return (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <p className="text-gray-400">마이페이지 준비 중...</p>
          </div>
        );

      default:
        return null;
    }
  };

  const handleTabChange = (tab: "map" | "chat" | "friends" | "mypage") => {
    setActiveTab(tab);

    if (tab === "map") {
      router.push("/map");
      return;
    }

    if (tab === "chat") {
      router.push("/home");
      return;
    }

    router.push("/home");
  };

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">채팅</h1>
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <Search className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-y-auto pb-24">{renderContent()}</main>

      {/* 하단 네비게이션 */}
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
