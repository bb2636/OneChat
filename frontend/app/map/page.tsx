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
    // 현재 로그인한 유저 ID 가져오기
    // TODO: 실제 세션/쿠키에서 가져오도록 수정 필요
    const fetchCurrentUser = async () => {
      try {
        // localStorage에서 임시로 가져오기 (실제로는 세션에서 가져와야 함)
        const storedUserId = localStorage.getItem("userId");
        if (storedUserId) {
          setUserId(storedUserId);
        } else {
          // API를 통해 현재 유저 정보 가져오기
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            if (data.user?.id) {
              setUserId(data.user.id);
              localStorage.setItem("userId", data.user.id);
            }
          } else {
            // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
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
      <div className="h-screen w-full flex items-center justify-center">
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
      router.push("/map");
      return;
    }

    // 현재 라우트 구조에서는 채팅/친구/마이페이지를 홈으로 연결
    router.push("/home");
  };

  return (
    <div className="relative h-screen w-full max-w-md mx-auto overflow-hidden bg-white">
      <NaverMap className="h-full w-full" userId={userId} />
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} unreadChatCount={0} />
    </div>
  );
}
