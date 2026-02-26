"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  LogOut,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ChatListItem } from "@/components/ChatListItem";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Chat } from "@/types";

interface MainPageProps {
  initialChats: Chat[];
}

interface Friend {
  id: string;
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
  status: string;
}

interface UserReport {
  id: string;
  reported_id: string;
  reported_name: string | null;
  reported_nickname: string | null;
  type: string;
  reason: string;
  description: string | null;
  admin_note?: string | null;
  handled_at?: string | null;
  admin_name?: string | null;
  admin_nickname?: string | null;
  created_at: string;
  display_status: "신고대기" | "신고완료";
}

interface UserInquiry {
  id: string;
  category: string;
  subject: string;
  content: string;
  admin_reply_content?: string | null;
  admin_reply_created_at?: string | null;
  admin_reply_name?: string | null;
  admin_reply_nickname?: string | null;
  created_at: string;
  display_status: "답변대기" | "답변완료";
}

interface CurrentUserProfile {
  id: string;
  username: string | null;
  nickname: string | null;
  phone_number: string | null;
  avatar_url: string | null;
}

const REPORT_TYPE_OPTIONS = [
  "음란·성적 행위",
  "아동·청소년 대상 성범죄",
  "욕설·폭력·혐오",
  "개인정보 무단 수집·유포",
  "비정상적인 서비스 이용",
  "사기·사칭",
  "기타",
] as const;
const FRIEND_SWIPE_DELETE_WIDTH = 74;
type ChatReadCountMap = Record<string, number>;

type MyPageScreen =
  | "root"
  | "report-list"
  | "report-detail"
  | "report-create"
  | "inquiry-list"
  | "inquiry-detail"
  | "inquiry-create";

export function MainPage({ initialChats }: MainPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"map" | "chat" | "friends" | "mypage">(
    "chat"
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chatReadCounts, setChatReadCounts] = useState<ChatReadCountMap>({});
  const [isFriendsMenuOpen, setIsFriendsMenuOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<Friend | null>(null);
  const [isDeletingFriends, setIsDeletingFriends] = useState(false);
  const [swipeOpenFriendId, setSwipeOpenFriendId] = useState<string | null>(null);
  const [swipeDragging, setSwipeDragging] = useState<{ friendId: string; offset: number } | null>(
    null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFriendsSectionOpen, setIsFriendsSectionOpen] = useState(true);
  const [myPageScreen, setMyPageScreen] = useState<MyPageScreen>("root");
  const [reportTargetId, setReportTargetId] = useState("");
  const [reportType, setReportType] = useState<(typeof REPORT_TYPE_OPTIONS)[number]>(
    "개인정보 무단 수집·유포"
  );
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [inquirySubject, setInquirySubject] = useState("");
  const [inquiryContent, setInquiryContent] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isReportTargetModalOpen, setIsReportTargetModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<UserInquiry | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveChatId, setLeaveChatId] = useState<string | null>(null);
  const [leaveChatTitle, setLeaveChatTitle] = useState<string>("");
  const [isLeavingChat, setIsLeavingChat] = useState(false);
  const reportTargetDropdownRef = useRef<HTMLDivElement | null>(null);
  const swipeStartXRef = useRef(0);
  const swipeStartYRef = useRef(0);
  const swipeStartOffsetRef = useRef(0);
  const swipeCurrentOffsetRef = useRef(0);
  const swipeActiveFriendIdRef = useRef<string | null>(null);
  const swipeIsHorizontalRef = useRef(false);

  const shouldHideBottomNav =
    activeTab === "mypage" &&
    (myPageScreen === "report-list" ||
      myPageScreen === "report-detail" ||
      myPageScreen === "report-create" ||
      myPageScreen === "inquiry-list" ||
      myPageScreen === "inquiry-detail" ||
      myPageScreen === "inquiry-create");

  // React Query로 데이터 관리 (캐싱 및 업데이트)
  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ["chats", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const res = await fetch(`/api/chats?userId=${currentUserId}`);
      if (!res.ok) throw new Error("Failed to fetch chats");
      return res.json() as Promise<Chat[]>;
    },
    initialData: initialChats,
    enabled: !!currentUserId,
    staleTime: 2 * 60 * 1000, // 2분간 fresh 상태 유지
    gcTime: 10 * 60 * 1000,
    refetchInterval: 30 * 1000, // 30초마다 백그라운드 업데이트
  });

  const chatReadStorageKey = useMemo(
    () => (currentUserId ? `onechat_chat_read_counts_${currentUserId}` : null),
    [currentUserId]
  );

  useEffect(() => {
    const resolveUser = async () => {
      const fromStorage = localStorage.getItem("userId");
      if (fromStorage) {
        setCurrentUserId(fromStorage);
        return;
      }

      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = (await res.json()) as { user?: { id?: string } };
        if (data.user?.id) {
          setCurrentUserId(data.user.id);
          localStorage.setItem("userId", data.user.id);
        }
      } catch (error) {
        console.error("Failed to resolve user:", error);
      }
    };

    resolveUser();
  }, []);

  useEffect(() => {
    if (!chatReadStorageKey) {
      setChatReadCounts({});
      return;
    }

    try {
      const stored = localStorage.getItem(chatReadStorageKey);
      if (!stored) {
        setChatReadCounts({});
        return;
      }
      const parsed = JSON.parse(stored) as ChatReadCountMap;
      setChatReadCounts(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setChatReadCounts({});
    }
  }, [chatReadStorageKey]);

  const { data: friends = [], isLoading: friendsLoading, refetch: refetchFriends } = useQuery({
    queryKey: ["friends", currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      const res = await fetch(`/api/friends?userId=${currentUserId}`);
      if (!res.ok) throw new Error("Failed to fetch friends");
      return (await res.json()) as Friend[];
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: reports = [], refetch: refetchReports } = useQuery({
    queryKey: ["user-reports", currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      const res = await fetch(`/api/reports?userId=${currentUserId}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return (await res.json()) as UserReport[];
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: inquiries = [], refetch: refetchInquiries } = useQuery({
    queryKey: ["user-inquiries", currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      const res = await fetch(`/api/inquiries?userId=${currentUserId}`);
      if (!res.ok) throw new Error("Failed to fetch inquiries");
      return (await res.json()) as UserInquiry[];
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: currentUserProfile } = useQuery({
    queryKey: ["current-user-profile", currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      const res = await fetch(`/api/users/profile?userId=${currentUserId}`);
      if (!res.ok) throw new Error("Failed to fetch user profile");
      const data = (await res.json()) as { user?: CurrentUserProfile };
      return data.user || null;
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (activeTab !== "friends" || isEditMode) {
      setSwipeOpenFriendId(null);
      setSwipeDragging(null);
    }
  }, [activeTab, isEditMode]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!isReportTargetModalOpen) return;
      if (!reportTargetDropdownRef.current) return;
      if (!reportTargetDropdownRef.current.contains(event.target as Node)) {
        setIsReportTargetModalOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isReportTargetModalOpen]);

  const selectedFriendNames = useMemo(() => {
    const names = friends
      .filter((friend) => selectedFriendIds.has(friend.id))
      .map((friend) => friend.name || friend.nickname || "친구");
    return names;
  }, [friends, selectedFriendIds]);

  const chatsWithUnread = useMemo(() => {
    return (chats || []).map((chat) => {
      const messageCount = Math.max(0, Number(chat.message_count || 0));
      const savedReadCount = Math.max(0, Number(chatReadCounts[chat.id] || 0));
      const serverUnread = Math.max(0, Number(chat.unread_count || 0));
      const computedUnread = Math.max(0, messageCount - savedReadCount);

      return {
        ...chat,
        unread_count: Math.max(serverUnread, computedUnread),
      };
    });
  }, [chats, chatReadCounts]);

  const totalUnreadCount = useMemo(() => {
    return chatsWithUnread.reduce((sum, chat) => sum + Math.max(0, Number(chat.unread_count || 0)), 0);
  }, [chatsWithUnread]);

  const [newChatNotificationVisible, setNewChatNotificationVisible] = useState(false);
  const prevUnreadCountRef = useRef(0);

  useEffect(() => {
    if (activeTab === "chat") {
      prevUnreadCountRef.current = totalUnreadCount;
      setNewChatNotificationVisible(false);
      return;
    }

    if (totalUnreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current > 0) {
      setNewChatNotificationVisible(true);
      const timer = window.setTimeout(() => {
        setNewChatNotificationVisible(false);
      }, 5000);
      return () => window.clearTimeout(timer);
    }

    prevUnreadCountRef.current = totalUnreadCount;
  }, [totalUnreadCount, activeTab]);

  const profileName = useMemo(() => {
    if (currentUserProfile?.nickname) return currentUserProfile.nickname;
    const firstFriend = friends[0];
    if (firstFriend?.name) return firstFriend.name;
    if (firstFriend?.nickname) return firstFriend.nickname;
    return "사용자";
  }, [currentUserProfile?.nickname, friends]);

  const reportTargetOptions = useMemo(() => {
    return friends.map((friend) => ({
      id: friend.id,
      label: friend.name || friend.nickname || "이름 없음",
    }));
  }, [friends]);

  const selectedReportTargetLabel = useMemo(() => {
    return reportTargetOptions.find((item) => item.id === reportTargetId)?.label || "";
  }, [reportTargetId, reportTargetOptions]);

  const toggleSelectFriend = (friendId: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const openEditMode = () => {
    setIsEditMode(true);
    setIsFriendsMenuOpen(false);
    setSwipeOpenFriendId(null);
    setSwipeDragging(null);
  };

  const closeEditMode = () => {
    setIsEditMode(false);
    setSelectedFriendIds(new Set());
    setIsDeleteConfirmOpen(false);
  };

  const closeDeleteModal = () => {
    setIsDeleteConfirmOpen(false);
    setSingleDeleteTarget(null);
  };

  const deleteFriendRelation = async (friendId: string) => {
    if (!currentUserId) throw new Error("로그인이 필요합니다.");

    const res = await fetch("/api/friends", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, friendId }),
    });

    if (!res.ok && res.status !== 404) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "친구 삭제에 실패했습니다.");
    }
  };

  const handleDeleteFriends = async () => {
    if (!currentUserId || selectedFriendIds.size === 0) return;

    setIsDeletingFriends(true);
    try {
      for (const friendId of selectedFriendIds) {
        await deleteFriendRelation(friendId);
      }

      await refetchFriends();
      setToastMessage(
        selectedFriendNames.length > 0
          ? `${selectedFriendNames.join(", ")}님을 친구목록에서 삭제했습니다.`
          : "선택한 친구를 삭제했습니다."
      );
      closeEditMode();
    } catch (error) {
      const message = error instanceof Error ? error.message : "친구 삭제 중 오류가 발생했습니다.";
      alert(message);
    } finally {
      setIsDeletingFriends(false);
    }
  };

  const handleDeleteSingleFriend = async () => {
    if (!singleDeleteTarget) return;

    setIsDeletingFriends(true);
    try {
      await deleteFriendRelation(singleDeleteTarget.id);
      await refetchFriends();
      setToastMessage(
        `${singleDeleteTarget.name || singleDeleteTarget.nickname || "친구"}님을 친구목록에서 삭제했습니다.`
      );
      setSwipeOpenFriendId(null);
      setSwipeDragging(null);
      setSingleDeleteTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "친구 삭제 중 오류가 발생했습니다.";
      alert(message);
    } finally {
      setIsDeletingFriends(false);
    }
  };

  const markChatAsRead = (chatId: string, messageCount: number) => {
    if (!chatReadStorageKey) return;

    setChatReadCounts((prev) => {
      const nextReadCount = Math.max(Number(prev[chatId] || 0), Math.max(0, messageCount));
      if (nextReadCount === Number(prev[chatId] || 0)) return prev;

      const next = { ...prev, [chatId]: nextReadCount };
      try {
        localStorage.setItem(chatReadStorageKey, JSON.stringify(next));
      } catch (error) {
        console.error("Failed to persist chat read state:", error);
      }
      return next;
    });
  };

  const handleFriendTouchStart = (friendId: string, e: React.TouchEvent<HTMLButtonElement>) => {
    if (isEditMode) return;
    const touch = e.touches[0];
    swipeActiveFriendIdRef.current = friendId;
    swipeStartXRef.current = touch.clientX;
    swipeStartYRef.current = touch.clientY;
    swipeStartOffsetRef.current = swipeOpenFriendId === friendId ? -FRIEND_SWIPE_DELETE_WIDTH : 0;
    swipeCurrentOffsetRef.current = swipeStartOffsetRef.current;
    swipeIsHorizontalRef.current = false;
    setSwipeDragging({ friendId, offset: swipeStartOffsetRef.current });
  };

  const handleFriendTouchMove = (friendId: string, e: React.TouchEvent<HTMLButtonElement>) => {
    if (isEditMode || swipeActiveFriendIdRef.current !== friendId) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartXRef.current;
    const deltaY = touch.clientY - swipeStartYRef.current;

    if (!swipeIsHorizontalRef.current) {
      if (Math.abs(deltaX) < 6) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        setSwipeDragging(null);
        return;
      }
      swipeIsHorizontalRef.current = true;
    }

    e.preventDefault();
    const nextOffset = Math.min(
      0,
      Math.max(-FRIEND_SWIPE_DELETE_WIDTH, swipeStartOffsetRef.current + deltaX)
    );
    swipeCurrentOffsetRef.current = nextOffset;
    setSwipeDragging({ friendId, offset: nextOffset });
  };

  const handleFriendTouchEnd = (friendId: string) => {
    if (isEditMode || swipeActiveFriendIdRef.current !== friendId) return;
    const isOpen = swipeCurrentOffsetRef.current <= -FRIEND_SWIPE_DELETE_WIDTH * 0.45;
    setSwipeOpenFriendId(isOpen ? friendId : null);
    setSwipeDragging(null);
    swipeActiveFriendIdRef.current = null;
    swipeIsHorizontalRef.current = false;
  };

  const resetReportForm = () => {
    setReportTargetId("");
    setReportType("개인정보 무단 수집·유포");
    setReportReason("");
    setReportDescription("");
    setIsReportTargetModalOpen(false);
  };

  const resetInquiryForm = () => {
    setInquirySubject("");
    setInquiryContent("");
  };

  const submitReport = async () => {
    if (!currentUserId) return;
    if (!reportTargetId || !reportReason.trim()) {
      alert("신고 대상과 신고 사유를 입력해주세요.");
      return;
    }

    setIsSubmittingReport(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterId: currentUserId,
          reportedId: reportTargetId,
          type: reportType,
          reason: reportReason.trim(),
          description: reportDescription.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "신고 등록에 실패했습니다.");

      await refetchReports();
      resetReportForm();
      setMyPageScreen("report-list");
      setToastMessage("신고가 정상적으로 접수되었습니다.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "신고 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const submitInquiry = async () => {
    if (!currentUserId) return;
    if (!inquirySubject.trim() || !inquiryContent.trim()) {
      alert("문의 제목과 내용을 입력해주세요.");
      return;
    }

    setIsSubmittingInquiry(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          category: "일반문의",
          subject: inquirySubject.trim(),
          content: inquiryContent.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "문의 등록에 실패했습니다.");

      await refetchInquiries();
      resetInquiryForm();
      setMyPageScreen("inquiry-list");
      setToastMessage("문의가 정상적으로 접수되었습니다.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "문의 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  const handleLogout = async () => {
    try {
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();

      if (typeof window !== "undefined" && "caches" in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
      }

      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch (error) {
      console.error("Failed to clear cache on logout:", error);
    } finally {
      setIsLogoutModalOpen(false);
      router.replace("/");
      router.refresh();
    }
  };

  const formatKDateTime = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${y}.${m}.${d} AM ${hh}:${mm}`;
  };

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

        if (!chatsWithUnread || chatsWithUnread.length === 0) {
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
            {chatsWithUnread.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                onClick={() => {
                  markChatAsRead(chat.id, Number(chat.message_count || 0));
                  router.push(`/chat/${chat.id}`);
                }}
                onLeave={(chatId) => {
                  setLeaveChatId(chatId);
                  setLeaveChatTitle(chat.title);
                  setIsLeaveModalOpen(true);
                }}
                isLeaveModalOpen={isLeaveModalOpen && leaveChatId === chat.id}
              />
            ))}
          </div>
        );

      case "friends":
        if (friendsLoading) {
          return (
            <div className="space-y-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-none" />
              ))}
            </div>
          );
        }

        if (!friends.length) {
          return (
            <div className="px-3">
              <div className="flex h-[calc(100vh-265px)] flex-col items-center justify-center rounded-2xl bg-transparent">
                <p className="mb-1 text-xs text-gray-400">주변을 둘러보며</p>
                <p className="mb-4 text-xs text-gray-400">친구를 추가해보세요.</p>
                <button
                  type="button"
                  onClick={() => router.push("/map")}
                  className="rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white"
                >
                  지도보기
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="px-3">
            <div className="rounded-2xl bg-white/90">
            {isFriendsSectionOpen &&
              friends.map((friend) => (
              <div key={friend.id} className="relative overflow-hidden">
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSingleDeleteTarget(friend);
                    }}
                    className="absolute inset-y-0 right-0 flex w-[74px] items-center justify-center bg-red-500 text-xs font-semibold text-white"
                  >
                    삭제
                  </button>
                )}

                <button
                  type="button"
                  onTouchStart={(e) => handleFriendTouchStart(friend.id, e)}
                  onTouchMove={(e) => handleFriendTouchMove(friend.id, e)}
                  onTouchEnd={() => handleFriendTouchEnd(friend.id)}
                  onTouchCancel={() => handleFriendTouchEnd(friend.id)}
                  onClick={() => {
                    if (isEditMode) {
                      toggleSelectFriend(friend.id);
                      return;
                    }
                    if (swipeOpenFriendId === friend.id) {
                      setSwipeOpenFriendId(null);
                    }
                  }}
                  className={cn(
                    "relative z-10 flex w-full items-center justify-between bg-white px-3 py-2.5 text-left",
                    isEditMode ? "hover:bg-gray-50" : ""
                  )}
                  style={{
                    transform: `translateX(${
                      swipeDragging?.friendId === friend.id
                        ? swipeDragging.offset
                        : swipeOpenFriendId === friend.id
                          ? -FRIEND_SWIPE_DELETE_WIDTH
                          : 0
                    }px)`,
                    transition:
                      swipeDragging?.friendId === friend.id ? "none" : "transform 180ms ease-out",
                    touchAction: isEditMode ? "auto" : "pan-y",
                  }}
                >
                  <div className="flex items-center gap-3">
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.name || friend.nickname || "friend"}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-gray-200" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {friend.name || friend.nickname || "이름 없음"}
                    </span>
                  </div>

                  {isEditMode && (
                    <span
                      className={cn(
                        "h-[18px] w-[18px] rounded-full border text-center text-[10px] leading-[16px]",
                        selectedFriendIds.has(friend.id)
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300 text-transparent"
                      )}
                    >
                      ✓
                    </span>
                  )}
                </button>
              </div>
              ))}
            </div>
          </div>
        );

      case "mypage":
        if (myPageScreen === "report-list") {
          return (
            <div className="px-3 pt-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">신고 내역</p>
                <button
                  type="button"
                  className="text-sm font-semibold text-blue-600"
                  onClick={() => setMyPageScreen("report-create")}
                >
                  신고하기
                </button>
              </div>
              <p className="mb-3 text-xs text-gray-500">신고내역 {reports.length}개</p>
              <div className="space-y-2">
                {reports.length === 0 ? (
                  <div className="flex h-[calc(100vh-260px)] items-center justify-center text-sm text-gray-400">
                    신고된 내역이 없어요.
                  </div>
                ) : (
                  reports.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setSelectedReport(item);
                        setMyPageScreen("report-detail");
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-left"
                    >
                      <span
                        className={cn(
                          "inline-flex rounded border px-2 py-0.5 text-[10px]",
                          item.display_status === "신고완료"
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-300 bg-white text-gray-500"
                        )}
                      >
                        {item.display_status}
                      </span>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        {item.reported_name || item.reported_nickname || "사용자"} · {item.type}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">{item.reason}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        }

        if (myPageScreen === "report-detail" && selectedReport) {
          const isDone = selectedReport.display_status === "신고완료";
          const targetName =
            selectedReport.reported_name || selectedReport.reported_nickname || "사용자";
          const adminName =
            selectedReport.admin_name || selectedReport.admin_nickname || "원챗";

          return (
            <div className="px-3 pt-3">
              <span
                className={cn(
                  "inline-flex rounded border px-2 py-0.5 text-[10px]",
                  isDone
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 bg-white text-gray-500"
                )}
              >
                {selectedReport.display_status}
              </span>

              <h3 className="mt-3 text-[24px] font-semibold leading-snug text-gray-900">
                {selectedReport.type}
              </h3>
              <p className="mt-3 text-sm font-semibold text-gray-800">{targetName}</p>
              <p className="text-xs text-gray-400">{formatKDateTime(selectedReport.created_at)}</p>
              <p className="mt-4 whitespace-pre-wrap break-all text-sm leading-6 text-gray-600">
                {selectedReport.reason}
                {selectedReport.description ? `\n\n${selectedReport.description}` : ""}
              </p>

              <div className="my-5 border-t border-gray-200" />

              {isDone ? (
                <>
                  <p className="text-sm font-semibold text-gray-800">원챗 고객지원팀</p>
                  <p className="text-xs text-gray-400">
                    {formatKDateTime(selectedReport.handled_at || selectedReport.created_at)}
                  </p>
                  <p className="mt-4 whitespace-pre-wrap break-all text-sm leading-6 text-gray-700">
                    {`안녕하세요. ${adminName}입니다.\n\n${
                      selectedReport.admin_note ||
                      "신고해주신 내용을 확인했고 검토를 진행했습니다. 관련 정책에 따라 필요한 조치를 처리했습니다."
                    }`}
                  </p>
                  <div className="my-5 border-t border-gray-200" />
                </>
              ) : (
                <div className="flex h-[36vh] items-center justify-center">
                  <p className="text-center text-sm leading-6 text-gray-400">
                    신고해주신 내용을 확인 중에 있습니다.
                    <br />
                    조금만 기다려주세요.
                  </p>
                </div>
              )}
            </div>
          );
        }

        if (myPageScreen === "report-create") {
          return (
            <div className="px-0 pt-0">
              <div className="mb-3 bg-[#eef0f2] px-4 py-3">
                <p className="text-xs font-semibold text-gray-600">안내</p>
                <p className="mt-1 text-xs text-gray-500">허위 신고 시 제재를 받을 수 있습니다.</p>
              </div>

              <div className="space-y-4 px-3">
                <div className="relative" ref={reportTargetDropdownRef}>
                  <label className="mb-1 block text-xs text-gray-600">신고대상 선택</label>
                  <button
                    type="button"
                    onClick={() => setIsReportTargetModalOpen((prev) => !prev)}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  >
                    <span>{selectedReportTargetLabel || "신고 대상을 선택해주세요."}</span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                  {isReportTargetModalOpen && (
                    <div className="absolute left-0 right-0 top-[52px] z-30 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                      <div className="max-h-56 overflow-y-auto">
                        <div className="border-b border-gray-100 px-4 py-3 text-center text-xl font-semibold text-gray-900">
                          직접 설정
                        </div>
                        {reportTargetOptions.length === 0 ? (
                          <div className="px-4 py-4 text-center text-sm text-gray-400">
                            선택 가능한 친구가 없습니다.
                          </div>
                        ) : (
                          reportTargetOptions.map((friend) => (
                            <button
                              key={friend.id}
                              type="button"
                              onClick={() => {
                                setReportTargetId(friend.id);
                                setIsReportTargetModalOpen(false);
                              }}
                              className={cn(
                                "flex h-16 w-full items-center justify-center border-b border-gray-100 text-lg font-semibold text-gray-900 last:border-b-0",
                                reportTargetId === friend.id ? "bg-blue-50 text-blue-600" : "bg-white"
                              )}
                            >
                              {friend.label}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs text-gray-600">신고 유형</label>
                  <div className="space-y-2">
                    {REPORT_TYPE_OPTIONS.map((item) => {
                      const checked = reportType === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setReportType(item)}
                          className="flex w-full items-center gap-2 text-left text-sm text-gray-700"
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 rounded-full border",
                              checked ? "border-blue-600 ring-4 ring-blue-50 bg-blue-600" : "border-gray-300"
                            )}
                          />
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-600">신고 제목</label>
                  <div className="relative">
                    <input
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 pr-12 text-sm outline-none"
                      placeholder="신고 제목을 입력해주세요."
                      maxLength={30}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                      {reportReason.length}/30
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-600">신고 내용</label>
                  <div className="relative">
                    <textarea
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      className="h-32 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 pb-6 text-sm outline-none"
                      placeholder="신고 사유를 구체적으로 작성해주세요."
                      maxLength={300}
                    />
                    <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-gray-400">
                      {reportDescription.length}/300
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-3 pt-4">
                <button
                  type="button"
                  onClick={submitReport}
                  disabled={isSubmittingReport}
                  className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white disabled:bg-blue-300"
                >
                  신고하기
                </button>
              </div>
            </div>
          );
        }

        if (myPageScreen === "inquiry-list") {
          return (
            <div className="px-3 pt-2">
              <p className="mb-3 text-xs text-gray-500">
                문의 <span className="text-blue-600">{inquiries.length}</span>개
              </p>
              <div className="space-y-2">
                {inquiries.length === 0 ? (
                  <div className="flex h-[calc(100vh-260px)] items-center justify-center text-sm text-gray-400">
                    등록된 문의가 없어요.
                  </div>
                ) : (
                  inquiries.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setSelectedInquiry(item);
                        setMyPageScreen("inquiry-detail");
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-left"
                    >
                      <span
                        className={cn(
                          "inline-flex rounded border px-2 py-0.5 text-[10px]",
                          item.display_status === "답변완료"
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-300 bg-white text-gray-500"
                        )}
                      >
                        {item.display_status}
                      </span>
                      <p className="mt-2 text-sm font-semibold text-gray-900">{item.subject}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">{item.content}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        }

        if (myPageScreen === "inquiry-detail" && selectedInquiry) {
          const isDone = selectedInquiry.display_status === "답변완료";
          const adminName =
            selectedInquiry.admin_reply_name ||
            selectedInquiry.admin_reply_nickname ||
            "원챗 고객지원팀";

          return (
            <div className="px-3 pt-3">
              <span
                className={cn(
                  "inline-flex rounded border px-2 py-0.5 text-[10px]",
                  isDone
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 bg-white text-gray-500"
                )}
              >
                {selectedInquiry.display_status}
              </span>

              <h3 className="mt-3 text-[32px] font-semibold leading-tight text-gray-900">
                {selectedInquiry.subject}
              </h3>
              <p className="mt-3 text-sm font-semibold text-gray-800">{profileName}</p>
              <p className="text-xs text-gray-400">{formatKDateTime(selectedInquiry.created_at)}</p>
              <p className="mt-4 whitespace-pre-wrap break-all text-sm leading-6 text-gray-600">
                {selectedInquiry.content}
              </p>

              <div className="my-5 border-t border-gray-200" />

              {isDone ? (
                <>
                  <p className="text-sm font-semibold text-gray-800">{adminName}</p>
                  <p className="text-xs text-gray-400">
                    {formatKDateTime(selectedInquiry.admin_reply_created_at || selectedInquiry.created_at)}
                  </p>
                  <p className="mt-4 whitespace-pre-wrap break-all text-sm leading-6 text-gray-700">
                    {selectedInquiry.admin_reply_content ||
                      "문의해주신 내용을 확인했고 처리 결과를 안내드립니다."}
                  </p>
                  <div className="my-5 border-t border-gray-200" />
                </>
              ) : (
                <div className="flex h-[36vh] items-center justify-center">
                  <p className="text-center text-sm leading-6 text-gray-400">
                    문의해주신 내용을 확인 중에 있습니다.
                    <br />
                    관리자가 확인 후 1~2일 내에 답변드릴 예정입니다.
                  </p>
                </div>
              )}
            </div>
          );
        }

        if (myPageScreen === "inquiry-create") {
          const isInquiryInvalid =
            !inquirySubject.trim() ||
            !inquiryContent.trim() ||
            inquirySubject.length > 30 ||
            inquiryContent.length > 300;

          return (
            <div className="px-3 pt-2">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">문의제목</label>
                  <div className="relative">
                    <input
                      value={inquirySubject}
                      onChange={(e) => setInquirySubject(e.target.value.slice(0, 30))}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 pr-12 text-sm outline-none"
                      placeholder="제목을 입력해주세요."
                      maxLength={30}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                      {inquirySubject.length}/30
                    </span>
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <textarea
                      value={inquiryContent}
                      onChange={(e) => setInquiryContent(e.target.value.slice(0, 300))}
                      className="h-32 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 pb-6 text-sm outline-none"
                      placeholder="문의하실 내용을 입력해주세요."
                      maxLength={300}
                    />
                    <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-gray-400">
                      {inquiryContent.length}/300
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-[#eceef1] px-3 py-3">
                  <p className="mb-2 text-xs font-semibold text-gray-700">안내 사항</p>
                  <ul className="list-disc space-y-2.5 pl-4 text-[11px] leading-6 text-gray-600 marker:text-gray-500">
                    <li className="whitespace-pre-line">
                      원활한 문의 처리를 위해 아래 내용을 함께 작성해 주세요.
                      {"\n"}문의 유형을 정확히 선택하시면 답변이 더 빨라집니다.
                    </li>
                    <li className="whitespace-pre-line">
                      문제가 발생한 화면 또는 채팅방 이름
                      {"\n"}발생 시간과 상황에 대한 간단한 설명
                      {"\n"}위치/알림 등 권한 설정 여부
                    </li>
                    <li className="whitespace-pre-line">
                      신고·차단 관련 문의의 경우
                      {"\n"}해당 사용자 또는 채팅방 정보를 함께 남겨주세요.
                    </li>
                    <li className="whitespace-pre-line">
                      접수된 문의는 순차적으로 확인되며
                      {"\n"}답변까지 최대 영업일 기준 1~3일이 소요될 수 있습니다.
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={submitInquiry}
                  disabled={isSubmittingInquiry || isInquiryInvalid}
                  className={cn(
                    "h-11 w-full rounded-xl text-sm font-semibold text-white",
                    isSubmittingInquiry || isInquiryInvalid
                      ? "cursor-not-allowed bg-gray-300"
                      : "bg-blue-600"
                  )}
                >
                  문의하기
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="px-3 pt-2">
            <p className="mb-3 text-base font-semibold text-gray-900">마이페이지</p>

            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUserProfile?.avatar_url ? (
                    <img
                      src={currentUserProfile.avatar_url}
                      alt="profile"
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-gray-200" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">안녕하세요</p>
                    <p className="text-sm font-bold text-blue-600">{profileName} 님</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/mypage/edit")}
                  className="rounded-full border border-gray-200 px-3 py-1 text-[11px] text-gray-600"
                >
                  프로필 수정
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="mb-2 text-xs text-gray-500">고객지원</p>
              <button
                type="button"
                onClick={() => setMyPageScreen("report-list")}
                className="flex h-10 w-full items-center justify-between text-sm text-gray-900"
              >
                <span className="inline-flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  신고하기
                </span>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
              <button
                type="button"
                onClick={() => setMyPageScreen("inquiry-list")}
                className="flex h-10 w-full items-center justify-between text-sm text-gray-900"
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  문의 하기
                </span>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="mb-2 text-xs text-gray-500">계정</p>
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                className="flex h-10 w-full items-center justify-between text-sm text-gray-900"
              >
                <span className="inline-flex items-center gap-2">
                  <LogOut className="h-4 w-4" /> 로그아웃
                </span>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            </div>
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
      setMyPageScreen("root");
      setSelectedReport(null);
      setSelectedInquiry(null);
      setIsReportTargetModalOpen(false);
      router.push("/home");
      return;
    }

    if (tab === "friends") {
      setMyPageScreen("root");
      setSelectedReport(null);
      setSelectedInquiry(null);
      setIsReportTargetModalOpen(false);
    }
    if (tab === "mypage") {
      setMyPageScreen("root");
      setIsReportTargetModalOpen(false);
    }

    router.push("/home");
  };

  return (
    <div className="relative flex h-screen max-w-md flex-col bg-white mx-auto">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-white">
        {activeTab === "friends" && isEditMode ? (
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button type="button" onClick={closeEditMode} className="text-sm text-gray-700">
              완료
            </button>
            <p className="text-sm font-semibold text-gray-900">편집</p>
            <button
              type="button"
              disabled={selectedFriendIds.size === 0 || isDeletingFriends}
              onClick={() => setIsDeleteConfirmOpen(true)}
              className={cn(
                "text-sm",
                selectedFriendIds.size > 0 && !isDeletingFriends
                  ? "text-red-500"
                  : "text-gray-300"
              )}
            >
              친구 삭제
            </button>
          </div>
        ) : activeTab === "mypage" && myPageScreen !== "root" ? (
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button
              type="button"
              onClick={() => {
                if (myPageScreen === "report-create") setMyPageScreen("report-list");
                else if (myPageScreen === "report-detail") setMyPageScreen("report-list");
                else if (myPageScreen === "inquiry-create") setMyPageScreen("inquiry-list");
                else if (myPageScreen === "inquiry-detail") setMyPageScreen("inquiry-list");
                else setMyPageScreen("root");
                setIsReportTargetModalOpen(false);
              }}
              className="rounded-full p-1 text-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="text-sm font-semibold text-gray-900">
              {myPageScreen === "report-list" && "신고 내역"}
              {myPageScreen === "report-detail" && "신고 내역"}
              {myPageScreen === "report-create" && "신고하기"}
              {myPageScreen === "inquiry-list" && "문의 내역"}
              {myPageScreen === "inquiry-detail" && "문의 내역"}
              {myPageScreen === "inquiry-create" && "문의하기"}
            </p>
            {myPageScreen === "inquiry-list" ? (
              <button
                type="button"
                onClick={() => setMyPageScreen("inquiry-create")}
                className="text-sm font-semibold text-blue-600"
              >
                문의하기
              </button>
            ) : (
              <div className="w-6" />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <h1 className="text-[27px] font-bold leading-none text-gray-900">
              {activeTab === "friends" ? "친구" : activeTab === "mypage" ? "" : "채팅"}
            </h1>

            {activeTab === "friends" ? (
              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/friends/search")}
                  className="rounded-full border border-gray-100 bg-white p-2 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <Search className="h-5 w-5 text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsFriendsMenuOpen((prev) => !prev)}
                  className="rounded-full border border-gray-100 bg-white p-2 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <MoreHorizontal className="h-5 w-5 text-gray-700" />
                </button>

                {isFriendsMenuOpen && (
                  <div className="absolute right-0 top-12 w-[106px] rounded-md border border-gray-100 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={openEditMode}
                      className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
                    >
                      편집
                    </button>
                  </div>
                )}
              </div>
            ) : activeTab === "mypage" ? (
              <div className="w-11" />
            ) : (
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Search className="w-5 h-5 text-gray-700" />
              </button>
            )}
          </div>
        )}

        {activeTab === "friends" && (
          <div className="flex items-center justify-between px-4 pb-2 pt-1">
            <p className="text-xs text-gray-500">친구 {friends.length}</p>
            <button
              type="button"
              onClick={() => setIsFriendsSectionOpen((prev) => !prev)}
              className="text-gray-400"
            >
              <ChevronUp
                className={cn("h-4 w-4 transition-transform", !isFriendsSectionOpen && "rotate-180")}
              />
            </button>
          </div>
        )}
      </header>

      {/* 메인 컨텐츠 */}
      <main className={cn("flex-1 overflow-y-auto", shouldHideBottomNav ? "pb-4" : "pb-24")}>
        {renderContent()}
      </main>

      {/* 하단 네비게이션 */}
      {!shouldHideBottomNav && (
        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} unreadChatCount={totalUnreadCount} />
      )}

      {newChatNotificationVisible && activeTab !== "chat" && (
        <div className="pointer-events-none fixed left-1/2 top-1/2 z-50 w-[85%] max-w-sm -translate-x-1/2 -translate-y-1/2">
          <div className="pointer-events-auto rounded-2xl bg-gray-800/90 px-5 py-4 text-center shadow-xl backdrop-blur-sm">
            <p className="text-sm font-medium text-white">새로운 채팅이 있습니다.</p>
          </div>
        </div>
      )}

      {(isDeleteConfirmOpen || !!singleDeleteTarget) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-6">
          <div className="w-full max-w-[335px] rounded-xl bg-white">
            <div className="border-b px-5 py-5 text-center">
              <h3 className="text-[22px] font-semibold text-gray-900">친구 삭제</h3>
              <p className="mt-2 text-[11px] leading-5 text-gray-500">
                {singleDeleteTarget
                  ? `${singleDeleteTarget.name || singleDeleteTarget.nickname || "선택한 친구"}를 삭제합니다.`
                  : "선택한 친구를 삭제합니다."}
                <br />
                다시 친구추가를 하려면 채팅방에서 추가하실 수 있습니다.
              </p>
            </div>
            <div className="grid grid-cols-2">
              <button type="button" onClick={closeDeleteModal} className="h-11 border-r text-sm text-blue-600">
                취소
              </button>
              <button
                type="button"
                disabled={isDeletingFriends}
                onClick={singleDeleteTarget ? handleDeleteSingleFriend : handleDeleteFriends}
                className="h-11 text-sm text-red-500 disabled:text-gray-300"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 w-[88%] max-w-sm -translate-x-1/2 rounded-full bg-black/60 px-4 py-3 text-center text-sm text-white">
          {toastMessage}
        </div>
      )}

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-[340px] rounded-2xl bg-white">
            <div className="border-b px-5 py-5 text-center">
              <p className="text-lg font-semibold text-gray-900">로그아웃</p>
              <p className="mt-2 text-xs text-gray-500">로그아웃 하시겠어요?</p>
            </div>
            <div className="grid grid-cols-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="h-11 border-r text-sm text-gray-500"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="h-11 text-sm font-semibold text-gray-900"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {isLeaveModalOpen && leaveChatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-[340px] rounded-2xl bg-white">
            <div className="border-b px-5 py-5 text-center">
              <h3 className="text-[22px] font-semibold text-gray-900">{leaveChatTitle}</h3>
              <p className="mt-2 text-sm text-gray-600">채팅방을 나가시겠어요?</p>
              <p className="mt-1 text-xs text-gray-500">대화내용이 모두 삭제되며 복원이 불가능 합니다.</p>
            </div>
            <div className="grid grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setIsLeaveModalOpen(false);
                  setLeaveChatId(null);
                  setLeaveChatTitle("");
                }}
                className="h-11 border-r text-sm font-semibold text-blue-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!leaveChatId || !currentUserId || isLeavingChat) return;
                  setIsLeavingChat(true);
                  try {
                    const res = await fetch(`/api/chats/${leaveChatId}/leave`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: currentUserId }),
                    });
                    const data = (await res.json().catch(() => ({}))) as { error?: string };
                    if (!res.ok) throw new Error(data.error || "채팅방 나가기에 실패했습니다.");
                    queryClient.invalidateQueries({ queryKey: ["chats"] });
                    setIsLeaveModalOpen(false);
                    setLeaveChatId(null);
                    setLeaveChatTitle("");
                  } catch (error) {
                    alert(error instanceof Error ? error.message : "채팅방 나가기 중 오류가 발생했습니다.");
                  } finally {
                    setIsLeavingChat(false);
                  }
                }}
                disabled={isLeavingChat}
                className="h-11 text-sm font-semibold text-red-500 disabled:text-gray-300"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
