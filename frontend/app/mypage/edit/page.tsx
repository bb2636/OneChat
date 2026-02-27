"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Camera } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProfileUser {
  id: string;
  username: string | null;
  nickname: string | null;
  phone_number: string | null;
  avatar_url: string | null;
}

export default function MyPageEditPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        router.replace("/login");
        return;
      }

      const res = await fetch(`/api/users/profile?userId=${userId}`);
      const data = (await res.json().catch(() => ({}))) as { user?: ProfileUser };
      if (!res.ok || !data.user) return;

      setUser(data.user);
      setNickname(data.user.nickname || "");
      setAvatarUrl(data.user.avatar_url || null);
    };

    load();
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const phoneFormatted = (value?: string | null) => {
    if (!value) return "010-0000-0000";
    const digits = value.replace(/\D/g, "");
    if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    return value;
  };

  const handleUploadAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("이미지 파일만 업로드할 수 있습니다.");
    }

    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/upload/profile", { method: "POST", body: formData });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !data.url) throw new Error(data.error || "이미지 업로드 실패");
    setAvatarUrl(data.url);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          nickname,
          password: password.trim() || undefined,
          avatarUrl,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; user?: ProfileUser };
      if (!res.ok || !data.user) throw new Error(data.error || "수정 실패");

      setUser(data.user);
      setNickname(data.user.nickname || "");
      setPassword("");
      setAvatarUrl(data.user.avatar_url || null);
      setIsEditing(false);
      setToast("프로필 정보가 수정되었습니다.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "프로필 수정 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto flex h-screen w-full max-w-md flex-col bg-white">
      <header className="flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-gray-200 bg-white p-2 shadow-sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-gray-900">내 정보 수정</p>
        <div className="w-8" />
      </header>

      <main className="flex-1 px-4 pt-4">
        <div className="mb-5 flex flex-col items-center">
          <div className="relative h-[72px] w-[72px]">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-[72px] w-[72px] rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`h-[72px] w-[72px] rounded-full bg-gray-300 ${avatarUrl ? 'hidden' : ''}`} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 rounded-full bg-white p-1.5 shadow disabled:opacity-50"
            >
              <Camera className="h-3 w-3" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                const input = e.currentTarget;
                if (!file) return;
                try {
                  if (!isEditing) setIsEditing(true);
                  setIsUploadingAvatar(true);
                  await handleUploadAvatar(file);
                  setToast("프로필 이미지가 변경되었습니다. 수정 완료를 눌러 저장해주세요.");
                } catch (error) {
                  alert(error instanceof Error ? error.message : "이미지 업로드 실패");
                } finally {
                  setIsUploadingAvatar(false);
                  if (input) input.value = "";
                }
              }}
            />
          </div>
          <p className="mt-3 text-lg font-semibold text-gray-900">{nickname || "사용자"}님</p>
        </div>

        <div className="mb-2 flex items-center justify-between text-xs">
          <span>아이디</span>
          <span>{user?.username || "xblock"}</span>
        </div>
        <div className="mb-2 h-px" />

        <div className="mb-2 flex items-center justify-between text-xs">
          <span>휴대폰 번호</span>
          <span>{phoneFormatted(user?.phone_number)}</span>
        </div>
        <div className="-mx-4 mb-4 h-[2px] bg-gray-300" />

        <label className="mb-1 block text-xs text-gray-600">닉네임</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={!isEditing}
          className={`mb-3 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500 ${
            isEditing ? "bg-gray-200 text-gray-900" : "bg-gray-200 text-gray-700"
          }`}
        />

        <label className="mb-1 block text-xs text-gray-600">비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={!isEditing}
          placeholder={isEditing ? "새 비밀번호를 입력하세요" : "••••••••••••"}
          className={`h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500 ${
            isEditing ? "bg-gray-200 text-gray-900" : "bg-gray-200 text-gray-700"
          }`}
        />
      </main>

      {toast && (
        <div className="pointer-events-none mb-2 mx-4 rounded-full bg-black/55 px-4 py-3 text-center text-sm text-white">
          {toast}
        </div>
      )}

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white disabled:bg-blue-300"
        >
          {isEditing ? "수정 완료" : "프로필 수정하기"}
        </button>
      </div>
    </div>
  );
}

