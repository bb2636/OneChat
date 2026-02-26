"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Image as ImageIcon, Menu, SendHorizonal, UserPlus } from "lucide-react";
import { cn } from "@/lib/cn";

interface ChatRoomClientProps {
  chatId: string;
  chatTitle: string;
  initialMessages: ChatMessage[];
  chatCreatedAt: string;
  initialReadStatuses?: Array<{ user_id: string; last_read_message_id: number }>;
}

interface ChatMessage {
  id: number;
  role: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id?: string | null;
  name?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
}

interface ChatMember {
  id: string;
  role: string;
  joined_at: string;
  name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  is_friend: boolean;
}

interface FriendSummary {
  id: string;
  name: string | null;
  nickname: string | null;
}

function formatKTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatImageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}.${month}.${day} ${hour}:${minute}`;
}

function isOutgoing(role: string) {
  const normalized = (role || "").toLowerCase();
  return normalized === "user" || normalized.startsWith("user:") || normalized === "me" || normalized === "self" || normalized === "owner";
}

export function ChatRoomClient({ chatId, chatTitle, initialMessages, chatCreatedAt, initialReadStatuses = [] }: ChatRoomClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedInviteUserId, setSelectedInviteUserId] = useState("");
  const [kickTarget, setKickTarget] = useState<ChatMember | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    senderName: string;
    timestamp: string;
  } | null>(null);
  const lastMessageTimeRef = useRef<string>(initialMessages.length > 0 ? initialMessages[initialMessages.length - 1].created_at : "");
  
  // 서버에서 받은 읽음 상태 (각 참여자의 마지막 읽은 메시지 ID)
  const [readStatuses, setReadStatuses] = useState<Map<string, number>>(() => {
    const initialMap = new Map<string, number>();
    initialReadStatuses.forEach((status) => {
      initialMap.set(status.user_id, status.last_read_message_id);
    });
    return initialMap;
  });

  // React Query로 멤버 및 친구 목록 캐싱
  const { data: members = [], isLoading: isMembersLoading, refetch: refetchMembers } = useQuery({
    queryKey: ["chat-members", chatId, currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const res = await fetch(`/api/chats/${chatId}/members?userId=${currentUserId}`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 403) {
          // 채팅방을 찾을 수 없거나 접근 권한이 없으면 홈으로 리다이렉트
          router.push("/home");
          return [];
        }
        throw new Error("참여자 정보를 불러오지 못했습니다.");
      }
      const memberList = await res.json() as ChatMember[];
      
      // 1:1 채팅의 경우 chat_members가 비어있을 수 있으므로
      // 멤버 목록이 비어있어도 접근 권한 체크는 API에서 이미 수행됨
      // 따라서 여기서는 추가 체크하지 않음
      
      return memberList;
    },
    enabled: !!currentUserId,
    staleTime: 30 * 1000, // 30초간 fresh
    gcTime: 5 * 60 * 1000,
  });

  const { data: friends = [] } = useQuery({
    queryKey: ["friends", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const res = await fetch(`/api/friends?userId=${currentUserId}`);
      if (!res.ok) throw new Error("친구 목록을 불러오지 못했습니다.");
      const friendData = (await res.json()) as Array<{
        id: string;
        name: string | null;
        nickname: string | null;
      }>;
      return friendData.map((f) => ({ id: f.id, name: f.name, nickname: f.nickname }));
    },
    enabled: !!currentUserId,
    staleTime: 2 * 60 * 1000, // 2분간 fresh
    gcTime: 10 * 60 * 1000,
  });

  // React Query로 메시지 캐싱 및 증분 업데이트
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>(initialMessages);
  const [lastFetchTime, setLastFetchTime] = useState<string>(
    initialMessages.length > 0 ? initialMessages[initialMessages.length - 1].created_at : ""
  );

  // 증분 업데이트: 마지막 메시지 시간 이후의 새 메시지만 가져오기
  const { data: incrementalData } = useQuery({
    queryKey: ["chat-messages-incremental", chatId, lastFetchTime],
    queryFn: async () => {
      if (!lastFetchTime) return { messages: [], readStatuses: [] };
      try {
        const encodedSince = encodeURIComponent(lastFetchTime);
        const res = await fetch(`/api/chats/${chatId}/messages?since=${encodedSince}`);
        if (!res.ok) {
          // 500 에러가 발생해도 빈 배열 반환 (에러 로그만 남기고 계속 진행)
          if (res.status === 500) {
            console.warn("Incremental message fetch failed, returning empty array");
            return { messages: [], readStatuses: [] };
          }
          throw new Error("메시지를 불러오지 못했습니다.");
        }
        const data = await res.json() as { messages?: ChatMessage[]; readStatuses?: Array<{ user_id: string; last_read_message_id: number }> };
        return {
          messages: data.messages || [],
          readStatuses: data.readStatuses || [],
        };
      } catch (error) {
        // 네트워크 오류 등도 빈 배열 반환
        console.warn("Incremental message fetch error:", error);
        return { messages: [], readStatuses: [] };
      }
    },
    enabled: !!lastFetchTime,
    staleTime: 5 * 1000, // 5초간 fresh
    gcTime: 5 * 60 * 1000,
    refetchInterval: 5 * 1000, // 5초마다 새 메시지 확인
    retry: false, // 증분 업데이트 실패 시 재시도하지 않음
  });

  // 새 메시지가 추가되면 displayMessages 업데이트 및 읽음 상태 업데이트
  useEffect(() => {
    if (incrementalData && incrementalData.messages.length > 0 && currentUserId && chatId) {
      setDisplayMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueNewMessages = incrementalData.messages.filter((m) => !existingIds.has(m.id));
        if (uniqueNewMessages.length > 0) {
          const updated = [...prev, ...uniqueNewMessages];
          setLastFetchTime(updated[updated.length - 1].created_at);
          
          // 읽음 상태 업데이트
          if (incrementalData.readStatuses) {
            const newReadStatuses = new Map(readStatuses);
            incrementalData.readStatuses.forEach((status) => {
              newReadStatuses.set(status.user_id, status.last_read_message_id);
            });
            setReadStatuses(newReadStatuses);
          }
          
          // 내가 보낸 메시지가 아니면 서버에 읽음 상태 업데이트
          const lastNewMessage = uniqueNewMessages[uniqueNewMessages.length - 1];
          if (lastNewMessage.user_id !== currentUserId) {
            updateReadStatus(lastNewMessage.id);
          }
          
          return updated;
        }
        return prev;
      });
    }
  }, [incrementalData, currentUserId, chatId, readStatuses]);

  // 읽음 상태 업데이트 함수
  const updateReadStatus = async (messageId: number) => {
    if (!currentUserId || !chatId) return;
    
    try {
      await fetch(`/api/chats/${chatId}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, messageId }),
      });
      
      // 로컬 상태도 업데이트
      setReadStatuses((prev) => {
        const next = new Map(prev);
        next.set(currentUserId, messageId);
        return next;
      });
    } catch (error) {
      console.error("Failed to update read status:", error);
    }
  };

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

  // 채팅방 진입 시 마지막 메시지 ID로 읽음 상태 업데이트
  useEffect(() => {
    if (!currentUserId || !chatId || displayMessages.length === 0) return;
    
    const lastMessageId = displayMessages[displayMessages.length - 1].id;
    if (lastMessageId) {
      updateReadStatus(lastMessageId);
    }
  }, [currentUserId, chatId, displayMessages.length]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const openRoomInfo = async () => {
    setIsInfoOpen(true);
    await refetchMembers();
  };

  const inviteCandidates = useMemo(() => {
    const memberIds = new Set(members.map((member) => member.id));
    return friends.filter((friend) => !memberIds.has(friend.id));
  }, [friends, members]);

  const filteredInviteCandidates = useMemo(() => {
    if (!inviteSearchQuery.trim()) return inviteCandidates;
    const query = inviteSearchQuery.toLowerCase();
    return inviteCandidates.filter(
      (friend) =>
        (friend.name || "").toLowerCase().includes(query) ||
        (friend.nickname || "").toLowerCase().includes(query)
    );
  }, [inviteCandidates, inviteSearchQuery]);

  const handleInvite = async () => {
    if (!currentUserId || selectedFriendIds.size === 0 || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const selectedCount = selectedFriendIds.size;
      const invitePromises = Array.from(selectedFriendIds).map((friendId) =>
        fetch(`/api/chats/${chatId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUserId, inviteUserId: friendId }),
        })
      );
      const results = await Promise.all(invitePromises);
      const errors = results.filter((res) => !res.ok);
      if (errors.length > 0) {
        throw new Error("일부 초대에 실패했습니다.");
      }
      setSelectedFriendIds(new Set());
      setIsInviteModalOpen(false);
      await refetchMembers();
      setToastMessage(`${selectedCount}명을 채팅방에 초대했습니다.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "초대 중 오류가 발생했습니다.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAddFriend = async (targetUserId: string) => {
    if (!currentUserId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: currentUserId, addresseeId: targetUserId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || "친구 추가에 실패했습니다.");
      await refetchMembers();
      queryClient.invalidateQueries({ queryKey: ["friends", currentUserId] });
      const friendName = members.find((m) => m.id === targetUserId)?.name || members.find((m) => m.id === targetUserId)?.nickname || "친구";
      setToastMessage(`${friendName}님이 친구목록에 추가되었습니다.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "친구 추가 중 오류가 발생했습니다.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleKickMember = async () => {
    if (!currentUserId || !kickTarget || isActionLoading) return;
    setIsActionLoading(true);
    try {
      // 친구 목록에서만 삭제 (채팅방에서는 내보내지 않음)
      const res = await fetch("/api/friends", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, friendId: kickTarget.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "친구 삭제에 실패했습니다.");
      setToastMessage(`${kickTarget.name || kickTarget.nickname || "선택한 친구"}님이 친구 목록에서 삭제되었습니다.`);
      setKickTarget(null);
      await refetchMembers();
      queryClient.invalidateQueries({ queryKey: ["friends", currentUserId] });
    } catch (error) {
      alert(error instanceof Error ? error.message : "친구 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const previewMembers = members.slice(0, 3);

  // Format date for display
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    const weekday = weekdays[date.getDay()];
    return `${year}년 ${String(month).padStart(2, "0")}월 ${String(day).padStart(2, "0")}일 ${weekday}`;
  }, []);

  // Load members on mount
  // React Query가 자동으로 멤버 정보를 로드합니다

  // Generate initial display items (date, members, notice, join messages)
  const initialDisplayItems = useMemo(() => {
    const items: Array<{ type: "date" | "member" | "notice" | "join"; content?: string; memberName?: string }> = [];
    
    // Add creation date
    if (chatCreatedAt) {
      items.push({ type: "date", content: formatDate(chatCreatedAt) });
    }

    // Add member join messages (sorted by joined_at)
    const sortedMembers = [...members].sort((a, b) => 
      new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
    );
    sortedMembers.forEach((member) => {
      const memberName = member.name || member.nickname || "사용자";
      items.push({ type: "join", memberName });
    });

    // Add policy notice
    items.push({
      type: "notice",
      content: "타인, 기관 등의 사칭에 유의해주세요. 금전 또는 개인정보를 요구 받을 경우 신고 해주시기 바랍니다. 운영정책을 위반한 메시지로 신고 접수 시 OneChat 이용에 제한이 있을 수 있습니다.",
    });

    return items;
  }, [chatCreatedAt, members, formatDate]);

  const handleSendMessage = async (imageUrl?: string) => {
    if (!currentUserId || (!messageInput.trim() && !imageUrl) || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          content: messageInput.trim() || null,
          imageUrl: imageUrl || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: ChatMessage };
      if (!res.ok) throw new Error(data.error || "메시지 전송에 실패했습니다.");
      
      if (data.message) {
        setDisplayMessages((prev) => [...prev, data.message!]);
        lastMessageTimeRef.current = data.message.created_at;
        // 캐시 업데이트
        queryClient.setQueryData(["chat-messages", chatId], (old: ChatMessage[] = []) => [...old, data.message!]);
        
        // 메시지를 보낼 때 서버에 읽음 상태 업데이트 (내가 보낸 메시지는 즉시 읽음 처리)
        if (data.message.id) {
          await updateReadStatus(data.message.id);
        }
        
        // 메시지를 보낼 때 읽음 카운트 업데이트 (내가 보낸 메시지는 즉시 읽음 처리)
        const chatReadStorageKey = `onechat_chat_read_counts_${currentUserId}`;
        try {
          const stored = localStorage.getItem(chatReadStorageKey);
          const chatReadCounts = stored ? JSON.parse(stored) : {};
          // 현재 메시지 카운트를 읽음 카운트로 업데이트
          const currentMessageCount = displayMessages.length + 1; // 방금 보낸 메시지 포함
          chatReadCounts[chatId] = currentMessageCount;
          localStorage.setItem(chatReadStorageKey, JSON.stringify(chatReadCounts));
        } catch (error) {
          console.error("Failed to update chat read count:", error);
        }
        
        // 채팅 목록 쿼리 invalidate하여 새로고침
        queryClient.invalidateQueries({ queryKey: ["chats", currentUserId] });
      }
      setMessageInput("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "메시지 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const uploadRes = await fetch("/api/upload/profile", {
        method: "POST",
        body: formData,
      });

      const uploadData = (await uploadRes.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "이미지 업로드에 실패했습니다.");
      }

      await handleSendMessage(uploadData.url);
    } catch (error) {
      alert(error instanceof Error ? error.message : "이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f5f7]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-[#f4f5f7] px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-800 shadow-sm"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="max-w-[60%] truncate text-base font-semibold text-gray-900">{chatTitle}</p>
        <button
          type="button"
          onClick={openRoomInfo}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {/* Initial display items (date, members, notice) - 항상 표시 */}
        {initialDisplayItems.length > 0 && (
          <>
            {initialDisplayItems.map((item, idx) => {
              if (item.type === "date") {
                return (
                  <div key={`date-${idx}`} className="flex justify-center py-2">
                    <div className="rounded-full bg-gray-200 px-3 py-1.5 text-xs text-gray-600">
                      {item.content}
                    </div>
                  </div>
                );
              }
              if (item.type === "join") {
                return (
                  <div key={`join-${idx}`} className="flex justify-center py-1">
                    <div className="rounded-full bg-gray-200 px-3 py-1.5 text-xs text-gray-600">
                      {item.memberName}님이 입장하셨습니다.
                    </div>
                  </div>
                );
              }
              if (item.type === "notice") {
                return (
                  <div key={`notice-${idx}`} className="flex justify-center py-2">
                    <div className="max-w-[85%] rounded-2xl bg-gray-200 px-4 py-3 text-xs leading-5 text-gray-600">
                      {item.content}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </>
        )}

        {/* Chat messages */}
        {displayMessages.length === 0 && initialDisplayItems.length === 0 ? (
          <div className="flex h-[55vh] items-center justify-center text-sm text-gray-400">
            아직 채팅 내역이 없습니다.
          </div>
        ) : (
          displayMessages.map((message, idx) => {
            // 시스템 메시지 (퇴장 메시지 등)
            if (message.role === "system" || message.role.startsWith("system:")) {
              return (
                <div key={message.id} className="flex justify-center py-1">
                  <div className="rounded-full bg-gray-200 px-3 py-1.5 text-xs text-gray-600">
                    {message.content}
                  </div>
                </div>
              );
            }

            // 메시지가 현재 사용자가 보낸 것인지 확인
            // user_id가 있으면 user_id로만 판단, 없으면 role로 판단
            const outgoing = message.user_id ? message.user_id === currentUserId : isOutgoing(message.role);
            const senderName = message.name || message.nickname || "사용자";
            const senderAvatar = message.avatar_url;
            
            // 같은 사용자의 연속된 메시지 그룹화를 위한 로직
            const prevMessage = idx > 0 ? displayMessages[idx - 1] : null;
            const prevOutgoing = prevMessage?.user_id 
              ? prevMessage.user_id === currentUserId 
              : isOutgoing(prevMessage?.role || "");
            const isSameSender = prevMessage && 
              prevMessage.user_id === message.user_id && 
              !prevMessage.role.startsWith("system") &&
              prevOutgoing === outgoing;
            const showSenderInfo = !outgoing && (!isSameSender || idx === 0);
            
            // 읽지 않은 참여자 수 계산 (내가 보낸 메시지만)
            let unreadCount = 0;
            if (outgoing && members.length > 0 && currentUserId) {
              // 내가 보낸 메시지의 경우: 각 참여자의 마지막 읽은 메시지 ID 확인
              // 각 참여자가 이 메시지를 읽었는지 확인
              let unreadMembers = 0;
              members.forEach((member) => {
                if (member.id === currentUserId) return; // 나는 제외
                
                const memberLastReadId = readStatuses.get(member.id) || 0;
                // 이 메시지가 해당 참여자의 마지막 읽은 메시지 ID보다 크면 읽지 않음
                if (message.id > memberLastReadId) {
                  unreadMembers++;
                }
              });
              
              unreadCount = unreadMembers;
            }

            if (outgoing) {
              // 오른쪽 정렬 (사용자 메시지)
              return (
                <div key={message.id} className="flex justify-end py-1">
                  <div className="flex max-w-[78%] items-end gap-2">
                    {/* 읽음 표시와 시간 - 왼쪽에 표시 */}
                    <div className="flex flex-col items-end gap-1 text-[11px] text-gray-500">
                      {unreadCount > 0 && (
                        <span className="text-gray-400">{unreadCount}</span>
                      )}
                      <span>{formatKTime(message.created_at)}</span>
                    </div>
                    {/* 메시지 버블 */}
                    <div className="flex flex-col items-end">
                      {message.image_url && (
                        <div className="mb-1">
                          <img
                            src={message.image_url}
                            alt="chat-image"
                            onClick={() => setSelectedImage({
                              url: message.image_url!,
                              senderName: "나",
                              timestamp: formatImageTime(message.created_at),
                            })}
                            className="h-48 w-48 cursor-pointer rounded-xl object-cover"
                          />
                        </div>
                      )}
                      {message.content && (
                        <div className="rounded-2xl rounded-tr-md bg-blue-600 px-3 py-2 text-sm text-white">
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            } else {
              // 왼쪽 정렬 (다른 사용자 메시지)
              return (
                <div key={message.id} className="flex justify-start py-1">
                  <div className="flex max-w-[78%] gap-2">
                    {showSenderInfo && (
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-gray-300 overflow-hidden">
                          {senderAvatar ? (
                            <img src={senderAvatar} alt={senderName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-gray-300" />
                          )}
                        </div>
                      </div>
                    )}
                    {!showSenderInfo && <div className="w-8" />}
                    <div className="flex-1">
                      {showSenderInfo && (
                        <div className="mb-1 text-xs font-medium text-gray-700">{senderName}</div>
                      )}
                      <div className="space-y-1">
                        {message.image_url && (
                          <div className="rounded-2xl rounded-tl-md bg-white px-3 py-2">
                            <img
                              src={message.image_url}
                              alt="chat-image"
                              onClick={() => setSelectedImage({
                                url: message.image_url!,
                                senderName: senderName,
                                timestamp: formatImageTime(message.created_at),
                              })}
                              className="h-48 w-48 cursor-pointer rounded-xl object-cover"
                            />
                          </div>
                        )}
                        {message.content && (
                          <div className="rounded-2xl rounded-tl-md bg-white px-3 py-2 text-sm text-gray-900">
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                        )}
                      </div>
                      {/* 시간 - 오른쪽에 표시 */}
                      <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-gray-500">
                        <span>{formatKTime(message.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          })
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploadingImage}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm disabled:opacity-50"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          <div className="flex h-11 flex-1 items-center rounded-full bg-[#f1f2f4] px-4">
            <input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && messageInput.trim()) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="메시지를 입력해주세요."
              className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={(!messageInput.trim() && !isUploadingImage) || isSending || isUploadingImage}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors",
              (messageInput.trim() || isUploadingImage) && !isSending && !isUploadingImage
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-gray-500 cursor-not-allowed"
            )}
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </footer>

      {isInfoOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          // 회색 배경(overlay) 클릭 시 멤버 목록 닫기
          onClick={() => setIsInfoOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-[280px] bg-[#f7f7f8] shadow-2xl"
            // 패널 내부 클릭은 닫기 동작이 발생하지 않도록 이벤트 전파 중단
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full flex-col">
              {/* 상단 여백만 유지하고 뒤로가기 버튼 제거 */}
              <div className="mb-3 p-4" />

              <div className="mb-2 flex justify-center">
                <div className="relative h-16 w-20">
                  {previewMembers.map((member, idx) => (
                    <div
                      key={member.id}
                      className={cn(
                        "absolute h-11 w-11 overflow-hidden rounded-full border-2 border-white bg-gray-200",
                        idx === 0 && "left-4 top-0",
                        idx === 1 && "left-0 top-5",
                        idx === 2 && "left-8 top-5"
                      )}
                    >
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="member-avatar" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <p className="mb-3 text-center text-xl font-semibold text-gray-900">{chatTitle}</p>

              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <p className="mb-3 text-xs text-gray-500">참여자 {members.length}</p>

                <button
                  type="button"
                  onClick={() => {
                    setIsInviteModalOpen(true);
                    refetchMembers();
                  }}
                  className="mb-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm text-gray-700"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-blue-600">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">초대하기</span>
                </button>

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {isMembersLoading ? (
                  <div className="py-8 text-center text-sm text-gray-400">불러오는 중...</div>
                ) : (
                  members.map((member) => {
                    const isMe = member.id === currentUserId;
                    const displayName = member.name || member.nickname || "참여자";

                    return (
                      <div key={member.id} className="flex items-center justify-between rounded-xl px-3 py-1">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 overflow-hidden rounded-full bg-gray-200">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <span className="text-sm text-gray-800">{displayName}</span>
                          {isMe && (
                            <span className="rounded bg-blue-100 px-1 py-0.5 text-[10px] font-semibold text-blue-600">
                              Me
                            </span>
                          )}
                        </div>

                        {!isMe && (
                          <div className="flex items-center gap-2">
                            {!member.is_friend ? (
                              <button
                                type="button"
                                onClick={() => handleAddFriend(member.id)}
                                className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-600"
                              >
                                <UserPlus className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setKickTarget(member)}
                                className="text-xs font-semibold text-red-500"
                              >
                                친구 삭제
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              </div>

              {/* 대화 나가기 버튼 - 오른쪽 하단 */}
              <div className="mt-auto flex justify-end p-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsLeaveModalOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm text-gray-700 shadow-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>대화 나가기</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 확대 보기 모달 */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center">
              <div className="text-sm font-medium text-white">{selectedImage.senderName}</div>
              <div className="text-xs text-gray-400">{selectedImage.timestamp}</div>
            </div>
            <div className="w-10" />
          </div>
          
          {/* 이미지 */}
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            <img
              src={selectedImage.url}
              alt="확대 이미지"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      )}

      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-[340px] rounded-2xl bg-white">
            <div className="border-b px-5 py-5 text-center">
              <h3 className="text-[22px] font-semibold text-gray-900">{chatTitle}</h3>
              <p className="mt-2 text-sm text-gray-600">채팅방을 나가시겠어요?</p>
              <p className="mt-1 text-xs text-gray-500">대화내용이 모두 삭제되며 복원이 불가능 합니다.</p>
            </div>
            <div className="grid grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setIsLeaveModalOpen(false);
                }}
                className="h-11 border-r text-sm font-semibold text-blue-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!currentUserId || isActionLoading) return;
                  setIsActionLoading(true);
                  try {
                    const res = await fetch(`/api/chats/${chatId}/leave`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: currentUserId }),
                    });
                    const data = (await res.json().catch(() => ({}))) as { error?: string };
                    if (!res.ok) throw new Error(data.error || "채팅방 나가기에 실패했습니다.");
                    setIsLeaveModalOpen(false);
                    setIsInfoOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["chats"] });
                    queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
                    router.push("/home");
                  } catch (error) {
                    alert(error instanceof Error ? error.message : "채팅방 나가기 중 오류가 발생했습니다.");
                  } finally {
                    setIsActionLoading(false);
                  }
                }}
                disabled={isActionLoading}
                className="h-11 text-sm font-semibold text-red-500 disabled:text-gray-300"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {kickTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-[340px] rounded-2xl bg-white">
            <div className="border-b px-5 py-5 text-center">
              <p className="text-[30px] font-semibold text-gray-900">친구 삭제</p>
              <p className="mt-2 text-[11px] leading-5 text-gray-500">
                선택한 친구를 친구 목록에서 삭제합니다.
                <br />
                채팅방에서는 나가지 않으며, 다시 친구 추가할 수 있습니다.
              </p>
            </div>
            <div className="grid grid-cols-2">
              <button
                type="button"
                onClick={() => setKickTarget(null)}
                className="h-11 border-r text-sm text-blue-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleKickMember}
                disabled={isActionLoading}
                className="h-11 text-sm text-red-500 disabled:text-gray-300"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-[85%] max-w-sm -translate-x-1/2 rounded-full bg-black/60 px-4 py-3 text-center text-sm text-white">
          {toastMessage}
        </div>
      )}

      {/* 친구 초대 모달 */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setSelectedFriendIds(new Set());
                  setInviteSearchQuery("");
                }}
                className="flex h-9 w-9 items-center justify-center text-gray-700"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <h2 className="text-base font-semibold text-gray-900">대화친구 초대</h2>
              <button
                type="button"
                onClick={handleInvite}
                disabled={selectedFriendIds.size === 0 || isActionLoading}
                className={cn(
                  "text-sm font-semibold",
                  selectedFriendIds.size > 0 && !isActionLoading
                    ? "text-blue-600"
                    : "text-gray-400"
                )}
              >
                확인
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={inviteSearchQuery}
                  onChange={(e) => setInviteSearchQuery(e.target.value)}
                  placeholder="검색"
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <p className="mb-2 text-xs font-medium text-gray-500">친구</p>
              {filteredInviteCandidates.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  {inviteSearchQuery ? "검색 결과가 없습니다." : "초대할 친구가 없습니다."}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredInviteCandidates.map((friend) => {
                    const isSelected = selectedFriendIds.has(friend.id);
                    const displayName = friend.name || friend.nickname || "친구";
                    return (
                      <div
                        key={friend.id}
                        onClick={() => toggleFriendSelection(friend.id)}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-gray-50"
                      >
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-200" />
                        <span className="flex-1 text-sm text-gray-900">{displayName}</span>
                        <div
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full border-2",
                            isSelected
                              ? "border-blue-600 bg-blue-600"
                              : "border-gray-300 bg-white"
                          )}
                        >
                          {isSelected && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

