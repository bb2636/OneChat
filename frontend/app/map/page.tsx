"use client";

import { useEffect, useState } from "react";
import { NaverMap } from "@/components/NaverMap";
import { useRouter } from "next/navigation";
import { BottomNavigation, type TabType } from "@/components/BottomNavigation";

export default function MapPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<TabType>("map");

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    return () => {};
  }, []);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const storedUserId = localStorage.getItem("userId");
        if (storedUserId) {
          setUserId(storedUserId);
        } else {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            if (data.user?.id) {
              setUserId(data.user.id);
              localStorage.setItem("userId", data.user.id);
            }
          } else {
            router.push("/login");
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/login");
      }
    };

    fetchCurrentUser();
  }, [router]);

  if (!userId) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);

    if (tab === "map") {
      return;
    }

    router.push(tab === "chat" ? "/home" : `/home?tab=${tab}`);
  };

  return (
    <div className="relative h-screen w-full max-w-md mx-auto overflow-hidden !bg-white !text-gray-900 flex flex-col" data-theme="light">
      <div className="flex-shrink-0 z-20 flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">지도</h1>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <NaverMap className="h-full w-full" userId={userId} />
      </div>
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} unreadChatCount={0} />
    </div>
  );
}
