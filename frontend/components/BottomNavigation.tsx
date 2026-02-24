"use client";

import { Map, MessageSquare, Users, User } from "lucide-react";
import { cn } from "@/lib/cn";

type TabType = "map" | "chat" | "friends" | "mypage";
export type { TabType };

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomNavigation({
  activeTab,
  onTabChange,
}: BottomNavigationProps) {
  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: "map", label: "지도", icon: <Map className="w-5 h-5" /> },
    { id: "chat", label: "채팅", icon: <MessageSquare className="w-5 h-5" /> },
    { id: "friends", label: "친구", icon: <Users className="w-5 h-5" /> },
    { id: "mypage", label: "마이페이지", icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav className="pointer-events-none fixed bottom-4 left-1/2 z-30 w-[calc(100%-28px)] max-w-[360px] -translate-x-1/2 safe-area-bottom">
      <div className="pointer-events-auto flex h-14 items-center justify-around rounded-full border border-gray-100 bg-white px-2 shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex h-full flex-1 flex-col items-center justify-center rounded-full text-[11px] transition-colors",
                isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.icon}
              <span className={cn("mt-0.5 text-[10px]", isActive ? "font-semibold" : "font-normal")}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
