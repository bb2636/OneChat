"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

interface Friend {
  id: string;
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
}

const HISTORY_KEY = "onechat_friend_search_history";
const MAX_HISTORY = 10;

export default function FriendSearchPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setHistory(parsed);
    } catch (error) {
      console.error("Failed to parse friend search history:", error);
    }
  }, []);

  const persistHistory = (next: string[]) => {
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const appendHistory = (term: string) => {
    const normalized = term.trim();
    if (!normalized) return;
    const next = [normalized, ...history.filter((item) => item !== normalized)].slice(0, MAX_HISTORY);
    persistHistory(next);
  };

  const removeHistory = (term: string) => {
    const next = history.filter((item) => item !== term);
    persistHistory(next);
  };

  const clearHistory = () => {
    persistHistory([]);
  };

  const runSearch = async (term: string) => {
    const normalized = term.trim();
    setAppliedKeyword(normalized);
    if (!normalized) {
      setFriends([]);
      return;
    }

    appendHistory(normalized);
    setLoading(true);
    try {
      let userId = localStorage.getItem("userId");
      if (!userId) {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = (await meRes.json()) as { user?: { id?: string } };
          if (meData.user?.id) {
            userId = meData.user.id;
            localStorage.setItem("userId", userId);
          }
        }
      }

      if (!userId) {
        setFriends([]);
        return;
      }

      const res = await fetch(`/api/friends?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch friends");

      const allFriends = (await res.json()) as Friend[];
      const lower = normalized.toLowerCase();
      const filtered = allFriends.filter((friend) => {
        const target = `${friend.name || ""} ${friend.nickname || ""}`.toLowerCase();
        return target.includes(lower);
      });
      setFriends(filtered);
    } catch (error) {
      console.error("Failed to search friends:", error);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const searched = appliedKeyword.length > 0;

  const titleCount = useMemo(() => friends.length, [friends.length]);

  return (
    <div className="mx-auto flex h-screen w-full max-w-md flex-col bg-[#eceef1]">
      <header className="px-3 pt-5">
        <p className="mb-2 text-sm font-medium text-gray-600">친구 검색</p>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-[42px] flex-1 items-center rounded-[10px] border border-[#e7e9ed] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <Search className="mr-2 h-4 w-4 text-black" strokeWidth={2.3} />
            <input
              autoFocus
              value={keyword}
              onChange={(e) => {
                const next = e.target.value;
                setKeyword(next);
                if (!next.trim()) {
                  setAppliedKeyword("");
                  setFriends([]);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch(keyword);
              }}
              placeholder="검색"
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
          <button type="button" onClick={() => router.back()} className="px-1 text-sm text-gray-600">
            취소
          </button>
        </div>
      </header>

      {!searched ? (
        <section className="mx-3 rounded-[10px] border border-[#e7e9ed] bg-white px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">최근 검색</p>
            <button
              type="button"
              onClick={clearHistory}
              disabled={history.length === 0}
              className="text-xs text-gray-400 disabled:opacity-40"
            >
              전체 삭제
            </button>
          </div>

          {history.length === 0 ? (
            <div className="py-2 text-center text-sm text-gray-400">검색 내역이 없습니다.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {history.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setKeyword(item);
                    runSearch(item);
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full bg-[#eceef1] px-3 text-xs text-gray-700"
                >
                  <span>{item}</span>
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHistory(item);
                    }}
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="mx-3 rounded-[10px] border border-[#e7e9ed] bg-white px-3 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="mb-1 text-sm font-semibold text-gray-700">
            친구 <span className="text-blue-600">{titleCount}</span>
          </div>

          <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
            {loading ? (
              <p className="px-2 py-10 text-center text-sm text-gray-400">검색 중...</p>
            ) : friends.length === 0 ? (
              <p className="px-2 py-10 text-center text-sm text-gray-400">검색 결과가 없습니다.</p>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className={cn("flex items-center gap-3 py-3")}>
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt={friend.name || friend.nickname || "friend"}
                      className="h-10 w-10 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`h-10 w-10 rounded-full bg-[#eceef1] ${friend.avatar_url ? 'hidden' : ''}`} />
                  <span className="text-sm font-medium text-gray-900">
                    {friend.name || friend.nickname || "이름 없음"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

