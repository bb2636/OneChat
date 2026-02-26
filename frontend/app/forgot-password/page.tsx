"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { cn } from "@/lib/cn";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setUsernameError("아이디를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      // 아이디로 사용자 정보 확인
      const res = await fetch("/api/auth/forgot-password/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          setUsernameError("가입된 아이디가 없습니다.");
        } else {
          setUsernameError(data.error || "아이디 확인에 실패했습니다.");
        }
        setIsLoading(false);
        return;
      }

      // 아이디 확인 성공 - 전화번호 입력 단계로 이동
      sessionStorage.setItem("forgot_password_username", username);
      router.push("/forgot-password/step2");
    } catch (error) {
      console.error("Check username error:", error);
      setUsernameError("아이디 확인 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-4 py-8">
      {/* 헤더 */}
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-900 text-3xl font-normal">
          &lt;
        </button>
        <h1 className="text-lg font-normal text-gray-900 flex-1 text-center">비밀번호 찾기</h1>
        <div className="text-sm text-gray-500 pt-0.5">1/4</div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 max-w-sm mx-auto w-full pb-24">
        <p className="text-gray-900 text-lg font-semibold mb-8">
          가입하신 아이디를 입력해주세요
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 아이디 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              아이디
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError(null);
              }}
              placeholder="아이디를 입력해주세요."
              className={cn(
                "w-full h-12 rounded-lg border px-4 text-gray-900 text-sm placeholder:text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                usernameError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 bg-white"
              )}
            />
            {usernameError && (
              <p className="mt-1.5 text-sm text-red-500">{usernameError}</p>
            )}
          </div>
        </form>
      </div>

      {/* 다음 버튼 - 최하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-4 py-4 border-t border-gray-200">
        <Button
          type="submit"
          disabled={!username.trim() || isLoading}
          onClick={handleSubmit}
          className={cn(
            "w-full font-medium h-12 rounded-lg transition-colors",
            username.trim()
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          )}
        >
          {isLoading ? "확인 중..." : "다음"}
        </Button>
      </div>
    </div>
  );
}
