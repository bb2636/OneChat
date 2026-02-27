"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  Headset,
  RefreshCw,
  Search,
  User,
  X,
} from "lucide-react";

type Menu = "users" | "reports" | "inquiries" | "terms";
type ReportStatus = "all" | "pending" | "resolved";
type InquiryStatus = "all" | "pending" | "answered";

type AdminUser = {
  id: string;
  username: string | null;
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  created_at: string;
};

type ReportItem = {
  id: string;
  type: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_name: string | null;
  reporter_username: string | null;
};

type InquiryItem = {
  id: string;
  subject: string;
  content: string;
  status: string;
  created_at: string;
  user_name: string | null;
  user_username: string | null;
};

type TermItem = {
  id: string;
  type: string;
  title: string;
  content: string;
  updated_at?: string;
};

const PAGE_SIZE = 10;
const DASHBOARD_CACHE_KEY = "admin_dashboard_cache_v2";
const DETAIL_REPLY_MIN_HEIGHT = 260;
const DETAIL_REPLY_MAX_HEIGHT = 380;

type CacheEntry<T> = {
  items: T[];
  totalPages: number;
  syncedAt: string;
};

type DashboardCache = {
  users: Record<string, CacheEntry<AdminUser>>;
  reports: Record<string, CacheEntry<ReportItem>>;
  inquiries: Record<string, CacheEntry<InquiryItem>>;
  terms: Record<string, CacheEntry<TermItem>>;
};

const EMPTY_CACHE: DashboardCache = { users: {}, reports: {}, inquiries: {}, terms: {} };

const REPORT_STATUS_OPTIONS: Array<{ value: ReportStatus; label: string }> = [
  { value: "all", label: "전체" },
  { value: "resolved", label: "신고 완료" },
  { value: "pending", label: "신고 대기" },
];

const INQUIRY_STATUS_OPTIONS: Array<{ value: InquiryStatus; label: string }> = [
  { value: "all", label: "전체" },
  { value: "answered", label: "답변 완료" },
  { value: "pending", label: "답변 전" },
];

const REPORT_STATUS_LABEL_MAP: Record<string, string> = {
  pending: "신고 대기",
  resolved: "신고 완료",
};

const INQUIRY_STATUS_LABEL_MAP: Record<string, string> = {
  pending: "답변 전",
  answered: "답변 완료",
};

function loadDashboardCache(): DashboardCache {
  if (typeof window === "undefined") return EMPTY_CACHE;
  try {
    const raw = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return EMPTY_CACHE;
    const parsed = JSON.parse(raw) as DashboardCache;
    return {
      users: parsed.users || {},
      reports: parsed.reports || {},
      inquiries: parsed.inquiries || {},
      terms: parsed.terms || {},
    };
  } catch {
    return EMPTY_CACHE;
  }
}

function saveDashboardCache(cache: DashboardCache) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cache));
}

function AdminDropdown<T extends string>({
  value,
  options,
  onChange,
  widthClass = "w-[110px]",
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find((item) => item.value === value)?.label || options[0]?.label || "";

  return (
    <div ref={ref} className={`relative ${widthClass}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-700"
      >
        <span>{selected}</span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`h-9 w-full border-b border-gray-100 text-center text-xs last:border-b-0 ${
                option.value === value ? "font-semibold text-blue-600" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const pages = useMemo(() => {
    const list: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i += 1) list.push(i);
    return list;
  }, [page, totalPages]);

  return (
    <div className="mt-4 flex items-center justify-center gap-4 text-sm">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="p-1 text-gray-500 disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`min-w-4 text-sm ${
            p === page ? "font-semibold text-black" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="p-1 text-gray-500 disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [activeMenu, setActiveMenu] = useState<Menu>("users");
  const [adminUser, setAdminUser] = useState<{
    id: string;
    username?: string;
    nickname?: string;
    role?: string;
  } | null>(null);
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [detailReply, setDetailReply] = useState("");
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [detailToastMessage, setDetailToastMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const detailReplyRef = useRef<HTMLTextAreaElement | null>(null);
  const detailToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);
  const [reportStatus, setReportStatus] = useState<ReportStatus>("all");

  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [inquiriesPage, setInquiriesPage] = useState(1);
  const [inquiriesTotalPages, setInquiriesTotalPages] = useState(1);
  const [inquiryStatus, setInquiryStatus] = useState<InquiryStatus>("all");

  const [terms, setTerms] = useState<TermItem[]>([]);
  const [activeTermType, setActiveTermType] = useState("privacy_policy");
  const [termTitle, setTermTitle] = useState("");
  const [termContent, setTermContent] = useState("");

  const TERM_TITLE_MAP: Record<string, string> = {
    privacy_policy: "개인정보 처리방침",
    terms_of_service: "서비스 이용약관",
    location_consent: "위치 정보 제공 동의",
  };

  useEffect(() => {
    const stored = localStorage.getItem("admin_user");
    if (!stored) {
      router.replace("/admin/login");
      return;
    }

    try {
      const parsed = JSON.parse(stored) as { id: string; role?: string };
      if (!parsed?.id || parsed.role !== "admin") {
        router.replace("/admin/login");
        return;
      }
      setAdminUser(JSON.parse(stored));
    } catch {
      router.replace("/admin/login");
    }
  }, [router]);

  useEffect(() => {
    if (!adminUser || activeMenu !== "users") return;
    const cacheKey = `${usersPage}|${search}`;
    const cache = loadDashboardCache();
    const cached = cache.users[cacheKey];

    if (cached) {
      setUsers(cached.items || []);
      setUsersTotalPages(cached.totalPages || 1);
    } else {
      setLoading(true);
    }

    const excludeId = adminUser.id || "";
    const requestUrl = cached
      ? `/api/admin/users?page=${usersPage}&q=${encodeURIComponent(search)}&excludeId=${excludeId}&since=${encodeURIComponent(cached.syncedAt)}`
      : `/api/admin/users?page=${usersPage}&q=${encodeURIComponent(search)}&excludeId=${excludeId}`;

    fetch(requestUrl)
      .then((r) => r.json())
      .then((data) => {
        const incoming = (data.items || []) as AdminUser[];
        const nextItems = cached && data.delta
          ? Array.from(
              new Map(
                [...cached.items, ...incoming].map((item) => [item.id, item] as const)
              ).values()
            )
              .sort(
                (a, b) =>
                  new Date(b.created_at as unknown as string).getTime() -
                  new Date(a.created_at as unknown as string).getTime()
              )
              .slice(0, PAGE_SIZE)
          : incoming;

        setUsers(nextItems);
        setUsersTotalPages(data.totalPages || 1);

        const fresh = loadDashboardCache();
        fresh.users[cacheKey] = {
          items: nextItems,
          totalPages: data.totalPages || 1,
          syncedAt: data.syncedAt || new Date().toISOString(),
        };
        saveDashboardCache(fresh);
      })
      .finally(() => {
        if (!cached) setLoading(false);
      });
  }, [adminUser, activeMenu, usersPage, search]);

  useEffect(() => {
    if (!adminUser || activeMenu !== "reports") return;
    const cacheKey = `${reportsPage}|${reportStatus}`;
    const cache = loadDashboardCache();
    const cached = cache.reports[cacheKey];

    if (cached) {
      setReports(cached.items || []);
      setReportsTotalPages(cached.totalPages || 1);
    } else {
      setLoading(true);
    }

    const requestUrl = cached
      ? `/api/admin/reports?page=${reportsPage}&status=${reportStatus}&since=${encodeURIComponent(cached.syncedAt)}`
      : `/api/admin/reports?page=${reportsPage}&status=${reportStatus}`;

    fetch(requestUrl)
      .then((r) => r.json())
      .then((data) => {
        const incoming = (data.items || []) as ReportItem[];
        const nextItems = cached && data.delta
          ? Array.from(new Map([...cached.items, ...incoming].map((item) => [item.id, item] as const)).values())
              .sort(
                (a, b) =>
                  new Date(b.created_at as unknown as string).getTime() -
                  new Date(a.created_at as unknown as string).getTime()
              )
              .slice(0, PAGE_SIZE)
          : incoming;

        setReports(nextItems);
        setReportsTotalPages(data.totalPages || 1);

        const fresh = loadDashboardCache();
        fresh.reports[cacheKey] = {
          items: nextItems,
          totalPages: data.totalPages || 1,
          syncedAt: data.syncedAt || new Date().toISOString(),
        };
        saveDashboardCache(fresh);
      })
      .finally(() => {
        if (!cached) setLoading(false);
      });
  }, [adminUser, activeMenu, reportsPage, reportStatus]);

  useEffect(() => {
    if (!adminUser || activeMenu !== "inquiries") return;
    const cacheKey = `${inquiriesPage}|${inquiryStatus}`;
    const cache = loadDashboardCache();
    const cached = cache.inquiries[cacheKey];

    if (cached) {
      setInquiries(cached.items || []);
      setInquiriesTotalPages(cached.totalPages || 1);
    } else {
      setLoading(true);
    }

    const requestUrl = cached
      ? `/api/admin/inquiries?page=${inquiriesPage}&status=${inquiryStatus}&since=${encodeURIComponent(cached.syncedAt)}`
      : `/api/admin/inquiries?page=${inquiriesPage}&status=${inquiryStatus}`;

    fetch(requestUrl)
      .then((r) => r.json())
      .then((data) => {
        const incoming = (data.items || []) as InquiryItem[];
        const nextItems = cached && data.delta
          ? Array.from(
              new Map(
                [...cached.items, ...incoming].map((item) => [item.id, item] as const)
              ).values()
            )
              .sort(
                (a, b) =>
                  new Date(b.created_at as unknown as string).getTime() -
                  new Date(a.created_at as unknown as string).getTime()
              )
              .slice(0, PAGE_SIZE)
          : incoming;

        setInquiries(nextItems);
        setInquiriesTotalPages(data.totalPages || 1);

        const fresh = loadDashboardCache();
        fresh.inquiries[cacheKey] = {
          items: nextItems,
          totalPages: data.totalPages || 1,
          syncedAt: data.syncedAt || new Date().toISOString(),
        };
        saveDashboardCache(fresh);
      })
      .finally(() => {
        if (!cached) setLoading(false);
      });
  }, [adminUser, activeMenu, inquiriesPage, inquiryStatus]);

  useEffect(() => {
    if (!adminUser || activeMenu !== "terms") return;
    const cache = loadDashboardCache();
    const cached = cache.terms.all;
    const cachedItems = Array.isArray(cached?.items) ? cached.items : [];
    if (cachedItems.length > 0) {
      setTerms(cachedItems);
    } else {
      setLoading(true);
    }

    const requestUrl = cached?.syncedAt
      ? `/api/admin/terms?since=${encodeURIComponent(cached.syncedAt)}`
      : "/api/admin/terms";

    const loadTerms = async () => {
      try {
        const res = await fetch(requestUrl);
        const data = await res.json();
        const incoming: TermItem[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        const nextItems = cached?.syncedAt && data?.delta && cachedItems.length > 0
          ? Array.from(
              new Map([...cachedItems, ...incoming].map((item) => [item.type, item] as const)).values()
            )
          : incoming;

        setTerms(nextItems);
        const fresh = loadDashboardCache();
        fresh.terms.all = {
          items: nextItems,
          totalPages: 1,
          syncedAt: data?.syncedAt || new Date().toISOString(),
        };
        saveDashboardCache(fresh);
      } finally {
        if (cachedItems.length === 0) setLoading(false);
      }
    };
    void loadTerms();
  }, [adminUser, activeMenu]);

  useEffect(() => {
    const safeTerms = Array.isArray(terms) ? terms : [];
    const current = safeTerms.find((term) => term.type === activeTermType);
    setTermTitle(current?.title || TERM_TITLE_MAP[activeTermType] || "");
    setTermContent(current?.content || "");
  }, [terms, activeTermType]);

  const currentTerm = useMemo(
    () => (Array.isArray(terms) ? terms : []).find((term) => term.type === activeTermType),
    [terms, activeTermType]
  );

  const formatUpdatedAt = (value?: string) => {
    if (!value) return "2000-00-00 00:00:00";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "2000-00-00 00:00:00";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_user");
    router.push("/admin/login");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!accountMenuRef.current) return;
      if (!accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedItem) {
      setDetailReply("");
      return;
    }
    const preset =
      (selectedItem.latest_reply as string | undefined) ||
      (selectedItem.admin_note as string | undefined) ||
      "";
    setDetailReply(preset);
  }, [selectedItem]);

  useEffect(() => {
    const el = detailReplyRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, DETAIL_REPLY_MIN_HEIGHT), DETAIL_REPLY_MAX_HEIGHT);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > DETAIL_REPLY_MAX_HEIGHT ? "auto" : "hidden";
  }, [detailReply, selectedItem]);

  useEffect(() => {
    return () => {
      if (detailToastTimerRef.current) {
        clearTimeout(detailToastTimerRef.current);
      }
    };
  }, []);

  const handleDeleteUser = async (id: string) => {
    if (!confirm("이 사용자를 삭제하시겠습니까?")) return;
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      alert("삭제에 실패했습니다.");
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== id));
    if ((selectedItem as { id?: string } | null)?.id === id) setSelectedItem(null);

    const cacheKey = `${usersPage}|${search}`;
    const cache = loadDashboardCache();
    const current = cache.users[cacheKey];
    if (current) {
      cache.users[cacheKey] = {
        ...current,
        items: current.items.filter((u) => u.id !== id),
      };
      saveDashboardCache(cache);
    }
  };

  const handleSaveTerm = async () => {
    const res = await fetch("/api/admin/terms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: activeTermType,
        title: termTitle || TERM_TITLE_MAP[activeTermType] || "약관",
        content: termContent,
        isActive: true,
      }),
    });

    if (!res.ok) {
      alert("저장에 실패했습니다.");
      return;
    }

    const refresh = await fetch("/api/admin/terms");
    const data = await refresh.json();
    const refreshedItems = Array.isArray(data) ? data : (data?.items || []);
    setTerms(refreshedItems as TermItem[]);
    const cache = loadDashboardCache();
    cache.terms.all = {
      items: refreshedItems as TermItem[],
      totalPages: 1,
      syncedAt: data?.syncedAt || new Date().toISOString(),
    };
    saveDashboardCache(cache);
    alert("저장되었습니다.");
  };

  const handleSaveDetailReply = async () => {
    if (!selectedItem) return;
    const id = selectedItem.id as string | undefined;
    if (!id) return;
    if (!detailReply.trim()) return;

    setIsSavingDetail(true);
    try {
      if (activeMenu === "inquiries") {
        const res = await fetch("/api/admin/inquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inquiryId: id,
            adminUserId: adminUser?.id,
            content: detailReply.trim(),
          }),
        });
        if (!res.ok) {
          alert("답변 저장에 실패했습니다.");
          return;
        }
        setInquiries((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: "answered", latest_reply: detailReply.trim() } : item
          )
        );
        setSelectedItem((prev) =>
          prev ? { ...prev, status: "answered", latest_reply: detailReply.trim() } : prev
        );
        setDetailToastMessage("문의 내역 답변 작성 완료");
      } else if (activeMenu === "reports") {
        const res = await fetch("/api/admin/reports", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            status: "resolved",
            adminNote: detailReply.trim(),
          }),
        });
        if (!res.ok) {
          alert("답변 저장에 실패했습니다.");
          return;
        }
        setReports((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: "resolved" } : item))
        );
        setSelectedItem((prev) =>
          prev ? { ...prev, status: "resolved", admin_note: detailReply.trim() } : prev
        );
        setDetailToastMessage("신고 내역 답변 작성 완료");
      }
      if (detailToastTimerRef.current) clearTimeout(detailToastTimerRef.current);
      detailToastTimerRef.current = setTimeout(() => {
        setDetailToastMessage("");
      }, 1800);
    } finally {
      setIsSavingDetail(false);
    }
  };

  const isDetailReplyEnabled = !isSavingDetail && detailReply.trim().length > 0;

  const handleRefreshTerms = async () => {
    setLoading(true);
    try {
      const refresh = await fetch("/api/admin/terms");
      const data = await refresh.json();
      const refreshedItems = Array.isArray(data) ? data : (data?.items || []);
      setTerms(refreshedItems as TermItem[]);
      const cache = loadDashboardCache();
      cache.terms.all = {
        items: refreshedItems as TermItem[],
        totalPages: 1,
        syncedAt: data?.syncedAt || new Date().toISOString(),
      };
      saveDashboardCache(cache);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value: string | null) => {
    if (!value) return "-";
    const digits = value.replace(/\D/g, "");
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    return value;
  };

  return (
    <div className="min-h-screen bg-[#3f3f3f]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] overflow-hidden bg-white">
        <aside className="w-[250px] border-r border-gray-200 bg-[#f7f8fa] p-4">
          <div className="mb-6 flex justify-center pt-2">
            <Image 
              src="/images/logo.png" 
              alt="OneChat" 
              width={72} 
              height={72} 
              style={{ width: "auto", height: "auto" }}
              priority 
            />
          </div>

          <button
            onClick={() => {
              setActiveMenu("users");
              setSelectedItem(null);
            }}
            className={`mb-2 w-full rounded px-3 py-2 text-left text-sm ${
              activeMenu === "users" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <User className="h-4 w-4" />
              유저 관리
            </span>
          </button>

          <button
            onClick={() => {
              setActiveMenu("reports");
              setSelectedItem(null);
            }}
            className={`mb-2 flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm ${
              activeMenu === "reports" || activeMenu === "inquiries"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Headset className="h-4 w-4" />
              신고 / 문의 내역
            </span>
            {activeMenu === "reports" || activeMenu === "inquiries" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {(activeMenu === "reports" || activeMenu === "inquiries") && (
            <div className="mb-2 ml-4 space-y-1 text-xs">
              <button
                onClick={() => {
                  setActiveMenu("reports");
                  setSelectedItem(null);
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left ${
                  activeMenu === "reports" ? "text-blue-600" : "text-gray-500"
                }`}
              >
                <span className={activeMenu === "reports" ? "text-blue-600" : "text-gray-400"}>•</span>
                신고 내역
              </button>
              <button
                onClick={() => {
                  setActiveMenu("inquiries");
                  setSelectedItem(null);
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left ${
                  activeMenu === "inquiries" ? "text-blue-600" : "text-gray-500"
                }`}
              >
                <span className={activeMenu === "inquiries" ? "text-blue-600" : "text-gray-400"}>•</span>
                문의 내역
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setActiveMenu("terms");
              setSelectedItem(null);
            }}
            className={`w-full rounded px-3 py-2 text-left text-sm ${
              activeMenu === "terms" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" />
              약관 관리
            </span>
          </button>

        </aside>

        <main className="flex-1 overflow-hidden">
          <header className="flex h-14 items-center justify-end border-b border-gray-200 px-6">
            <div ref={accountMenuRef} className="relative">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">
                  {(adminUser?.nickname || adminUser?.username || "관리자")} 님
                </span>
                <button
                  type="button"
                  onClick={() => setIsAccountDropdownOpen((prev) => !prev)}
                  className="inline-flex h-8 items-center rounded-md bg-blue-600 px-3 text-xs font-semibold text-white"
                >
                  관리자
                </button>
              </div>

              {isAccountDropdownOpen && (
                <div className="absolute right-0 z-20 mt-1 w-28 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="h-9 w-full text-xs text-red-500 hover:bg-red-50"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </header>

          <div className="h-[calc(100vh-56px)] overflow-auto">
            {activeMenu === "users" && (
              <section>
                <div className="px-6 pt-3">
                  <h2 className="mb-4 text-[34px] font-semibold tracking-tight text-gray-900">유저 관리</h2>
                </div>
                <div className="mb-4 flex justify-end px-6">
                  <div className="relative w-[320px]">
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => {
                        setUsersPage(1);
                        setSearch(e.target.value);
                      }}
                      placeholder="검색어를 입력해주세요."
                      className="h-10 w-full rounded-full border border-blue-300 px-4 pr-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-y">
                        <th className="p-3 text-center">아이디</th>
                        <th className="p-3 text-center">닉네임</th>
                        <th className="p-3 text-center">프로필 사진</th>
                        <th className="p-3 text-center">휴대폰 번호</th>
                        <th className="p-3 text-center">보기</th>
                        <th className="p-3 text-center">권한 처리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b">
                          <td className="p-3 text-center">{u.username || "-"}</td>
                          <td className="p-3 text-center">{u.nickname || "-"}</td>
                          <td className="p-3 text-center">
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt="avatar"
                                className="mx-auto h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="mx-auto h-10 w-10 rounded bg-gray-100" />
                            )}
                          </td>
                          <td className="p-3 text-center">{formatPhoneNumber(u.phone_number)}</td>
                          <td className="p-3 text-center">
                            <button
                              className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-600"
                              onClick={() => setSelectedItem(u as unknown as Record<string, unknown>)}
                            >
                              상세보기
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
                              onClick={() => handleDeleteUser(u.id)}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!loading && users.length === 0 && (
                  <p className="py-10 text-center text-sm text-gray-500">사용자가 없습니다.</p>
                )}
                <Pagination page={usersPage} totalPages={usersTotalPages} onChange={setUsersPage} />
              </section>
            )}

            {activeMenu === "reports" && (
              <section>
                <div className="px-6 pt-3">
                  <h2 className="mb-4 text-[34px] font-semibold tracking-tight text-gray-400">
                    신고 / 문의 내역 <span className="text-gray-900">› 신고 내역</span>
                  </h2>
                </div>
                <div className="mb-4 px-6">
                  <AdminDropdown<ReportStatus>
                    value={reportStatus}
                    options={REPORT_STATUS_OPTIONS}
                    onChange={(value) => {
                      setReportsPage(1);
                      setReportStatus(value);
                    }}
                    widthClass="w-[110px]"
                  />
                </div>

                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-y text-gray-500">
                      <th className="p-3 text-center">신고일</th>
                      <th className="p-3 text-center">신고 유형</th>
                      <th className="p-3 text-center">제목</th>
                      <th className="p-3 text-center">작성자</th>
                      <th className="p-3 text-center">상태</th>
                      <th className="p-3 text-center">보기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="p-3 text-center">{(r.created_at || "").slice(0, 10)}</td>
                        <td className="p-3 text-center">{r.type}</td>
                        <td className="p-3 text-center">{r.reason}</td>
                        <td className="p-3 text-center">{r.reporter_name || r.reporter_username || "-"}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex rounded border px-2 py-0.5 text-xs ${
                              r.status === "resolved"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                                : "border-gray-300 bg-white text-gray-500"
                            }`}
                          >
                            {REPORT_STATUS_LABEL_MAP[r.status] || r.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-600"
                            onClick={() => setSelectedItem(r as unknown as Record<string, unknown>)}
                          >
                            상세보기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loading && reports.length === 0 && (
                  <p className="py-10 text-center text-sm text-gray-500">신고 내역이 없습니다.</p>
                )}
                <Pagination page={reportsPage} totalPages={reportsTotalPages} onChange={setReportsPage} />
              </section>
            )}

            {activeMenu === "inquiries" && (
              <section>
                <div className="px-6 pt-3">
                  <h2 className="mb-4 text-[34px] font-semibold tracking-tight text-gray-400">
                    신고 / 문의 내역 <span className="text-gray-900">› 문의 내역</span>
                  </h2>
                </div>
                <div className="mb-4 px-6">
                  <AdminDropdown<InquiryStatus>
                    value={inquiryStatus}
                    options={INQUIRY_STATUS_OPTIONS}
                    onChange={(value) => {
                      setInquiriesPage(1);
                      setInquiryStatus(value);
                    }}
                    widthClass="w-[110px]"
                  />
                </div>

                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-y text-gray-500">
                      <th className="p-3 text-center">문의일</th>
                      <th className="p-3 text-center">제목</th>
                      <th className="p-3 text-center">내용</th>
                      <th className="p-3 text-center">작성자</th>
                      <th className="p-3 text-center">상태</th>
                      <th className="p-3 text-center">보기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inquiries.map((i) => (
                      <tr key={i.id} className="border-b">
                        <td className="p-3 text-center">{(i.created_at || "").slice(0, 10)}</td>
                        <td className="p-3 text-center">{i.subject}</td>
                        <td className="max-w-[320px] truncate p-3 text-center">{i.content}</td>
                        <td className="p-3 text-center">{i.user_name || i.user_username || "-"}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex rounded border px-2 py-0.5 text-xs ${
                              i.status === "answered"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                                : "border-gray-300 bg-white text-gray-500"
                            }`}
                          >
                            {INQUIRY_STATUS_LABEL_MAP[i.status] || i.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-600"
                            onClick={() => setSelectedItem(i as unknown as Record<string, unknown>)}
                          >
                            상세보기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loading && inquiries.length === 0 && (
                  <p className="py-10 text-center text-sm text-gray-500">문의 내역이 없습니다.</p>
                )}
                <Pagination page={inquiriesPage} totalPages={inquiriesTotalPages} onChange={setInquiriesPage} />
              </section>
            )}

            {activeMenu === "terms" && (
              <section>
                <div className="px-6 pt-3">
                  <h2 className="mb-4 text-[34px] font-semibold tracking-tight text-gray-900">약관 관리</h2>
                </div>
                <div className="mb-3 flex gap-0 border-b px-6 text-sm">
                  {[
                    { key: "privacy_policy", label: "개인정보 처리방침" },
                    { key: "terms_of_service", label: "서비스 이용약관" },
                    { key: "location_consent", label: "위치 정보 제공 동의" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTermType(tab.key)}
                      className={`border-b-2 px-5 py-2 text-left transition-colors ${
                        activeTermType === tab.key
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-3 px-6">
                  <div className="flex items-center justify-end">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <p>{formatUpdatedAt(currentTerm?.updated_at)} 업데이트 됨</p>
                      <button
                        type="button"
                        onClick={handleRefreshTerms}
                        aria-label="약관 새로고침"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={termContent}
                    onChange={(e) => setTermContent(e.target.value)}
                    placeholder={`${TERM_TITLE_MAP[activeTermType] || "약관"} 내용을 입력해주세요.`}
                    className="blue-scrollbar min-h-[520px] w-full rounded-lg border border-gray-200 bg-gray-100 p-4 text-sm text-gray-800 placeholder:text-gray-400"
                  />
                  <div className="flex justify-end">
                    <button onClick={handleSaveTerm} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
                      저장
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>

        {selectedItem && (
          <div className="fixed inset-0 z-50 bg-black/45">
            <div className="ml-auto h-full w-[430px] border-l border-gray-200 bg-white">
              <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
                <h3 className="text-base font-semibold text-gray-800">
                  {activeMenu === "reports" ? "신고내역 상세보기" : "문의내역 상세보기"}
                </h3>
                <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-gray-800">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex h-[calc(100%-56px)] flex-col">
                <div className="flex-1 overflow-hidden">
                  <div className="space-y-4 p-4 text-sm">
                    <div>
                      <p className="mb-2 text-[11px] text-gray-400">작성자</p>
                      <div className="rounded-md bg-gray-100 px-3 py-2.5">
                        <p className="text-sm font-medium text-gray-800">
                          {String(
                            (selectedItem.reporter_name as string | undefined) ||
                              (selectedItem.user_name as string | undefined) ||
                              "-"
                          )}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          {String(
                            (selectedItem.reporter_username as string | undefined) ||
                              (selectedItem.user_username as string | undefined) ||
                              "-"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-gray-200 pt-3">
                      <div className="grid grid-cols-[64px_1fr] items-start gap-2">
                        <p className="pt-0.5 text-[11px] text-gray-400">
                          {activeMenu === "reports" ? "신고 제목" : "문의 제목"}
                        </p>
                        <p className="text-sm leading-5 text-gray-800">
                          {String(
                            (selectedItem.reason as string | undefined) ||
                              (selectedItem.subject as string | undefined) ||
                              "-"
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-[64px_1fr] items-start gap-2">
                        <p className="pt-0.5 text-[11px] text-gray-400">상태</p>
                        <span
                          className={`inline-flex w-fit rounded border px-2 py-0.5 text-[11px] ${
                            String(selectedItem.status) === "resolved" ||
                            String(selectedItem.status) === "answered"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                              : "border-gray-300 bg-white text-gray-500"
                          }`}
                        >
                          {activeMenu === "reports"
                            ? REPORT_STATUS_LABEL_MAP[String(selectedItem.status)] || String(selectedItem.status)
                            : INQUIRY_STATUS_LABEL_MAP[String(selectedItem.status)] || String(selectedItem.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-[64px_1fr] items-start gap-2">
                        <p className="pt-0.5 text-[11px] text-gray-400">
                          {activeMenu === "reports" ? "신고일" : "문의일"}
                        </p>
                        <p className="text-sm text-gray-700">
                          {String(selectedItem.created_at || "").slice(0, 10).replaceAll("-", ".")}
                        </p>
                      </div>

                      <div className="grid grid-cols-[64px_1fr] items-start gap-2">
                        <p className="pt-0.5 text-[11px] text-gray-400">
                          {activeMenu === "reports" ? "신고 내용" : "문의 내용"}
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                          {String(
                            (selectedItem.description as string | undefined) ||
                              (selectedItem.content as string | undefined) ||
                              "-"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-gray-200 bg-gray-100 px-4 pb-8 pt-0">
                    <div className="grid grid-cols-[64px_1fr] items-start gap-2">
                      <p className="pt-3 text-[11px] text-gray-400">답변 등록</p>
                      <textarea
                        ref={detailReplyRef}
                        value={detailReply}
                        onChange={(e) => {
                          setDetailReply(e.target.value);
                          e.currentTarget.style.height = "auto";
                          const nextHeight = Math.min(
                            Math.max(e.currentTarget.scrollHeight, DETAIL_REPLY_MIN_HEIGHT),
                            DETAIL_REPLY_MAX_HEIGHT
                          );
                          e.currentTarget.style.height = `${nextHeight}px`;
                          e.currentTarget.style.overflowY =
                            e.currentTarget.scrollHeight > DETAIL_REPLY_MAX_HEIGHT ? "auto" : "hidden";
                        }}
                        placeholder="내용을 입력해 주세요."
                        className="h-[260px] w-full resize-none overflow-y-hidden border-none bg-transparent pt-3 text-sm leading-6 text-gray-700 placeholder:text-gray-400 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 bg-gray-50 px-4 py-5">
                  <button
                    type="button"
                    onClick={handleSaveDetailReply}
                    disabled={!isDetailReplyEnabled}
                    className={`ml-auto block h-9 rounded-md px-6 text-xs text-white ${
                      isDetailReplyEnabled ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400"
                    } disabled:opacity-60`}
                  >
                    답변 완료
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {detailToastMessage && (
        <div className="pointer-events-none fixed inset-x-0 top-14 z-[70] flex justify-center">
          <div className="w-[280px] rounded-lg border border-gray-200 bg-white px-4 py-5 text-center shadow-lg">
            <div className="mx-auto mb-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] text-white">
              ✓
            </div>
            <p className="text-sm font-semibold text-blue-600">{detailToastMessage}</p>
            <p className="mt-1 text-[11px] text-gray-400">답변이 성공적으로 작성되었습니다.</p>
          </div>
        </div>
      )}

      <p className="sr-only">page size {PAGE_SIZE}</p>
    </div>
  );
}
