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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isActive
                  ? "text-blue-500"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.icon}
              <span
                className={cn(
                  "text-xs mt-1",
                  isActive ? "font-semibold" : "font-normal"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* iOS 홈 인디케이터 */}
      <div className="h-1 bg-black rounded-full w-32 mx-auto mb-1" />
    </nav>
  );
}
