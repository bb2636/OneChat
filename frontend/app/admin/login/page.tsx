"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { Eye, EyeOff, Shield } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setIsLoading(true);

    // 유효성 검사
    const newErrors: string[] = [];
    if (!username.trim()) {
      newErrors.push("아이디를 입력해주세요.");
    }
    if (!password.trim()) {
      newErrors.push("비밀번호를 입력해주세요.");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          setErrors(["가입된 계정 정보가 없습니다."]);
        } else if (res.status === 401) {
          setErrors(["아이디 또는 비밀번호가 일치하지 않습니다."]);
        } else if (res.status === 403) {
          setErrors(["관리자 권한이 없습니다."]);
        } else {
          setErrors([data.error || "로그인에 실패했습니다."]);
        }
        setIsLoading(false);
        return;
      }

      // 로그인 성공 - 관리자 대시보드로 이동
      router.push("/admin/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      setErrors(["로그인 중 오류가 발생했습니다."]);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ backgroundColor: '#6983FC' }}>
      {/* 로고/아이콘 영역 */}
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto bg-gray-800 rounded-2xl flex items-center justify-center shadow-lg">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 text-center">
          관리자 로그인
        </h1>
        <p className="text-sm text-gray-600 mt-2 text-center">
          원챗 관리자 시스템
        </p>
      </div>

      {/* 로그인 폼 */}
      <div className="w-full max-w-md">
        <form onSubmit={handleLogin} className="space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          {/* 아이디 입력 */}
          <Input
            label="아이디"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="아이디를 입력해주세요."
            className="bg-white"
          />

          {/* 비밀번호 입력 */}
          <div className="relative">
            <Input
              label="비밀번호"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력해주세요."
              className="bg-white pr-10"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              }
            />
          </div>

          {/* 에러 메시지 */}
          {errors.length > 0 && (
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* 로그인 버튼 */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-lg"
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        {/* 일반 사용자 로그인 링크 */}
        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            일반 사용자 로그인
          </a>
        </div>
      </div>
    </div>
  );
}
