"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Input, Button } from "@/components/ui";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { LOGO_PATHS } from "@/lib/constants";
import { Toast } from "@/components/Toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // URL 쿼리 파라미터에서 에러 및 성공 메시지 처리
  useEffect(() => {
    const error = searchParams.get("error");
    const googleAuth = searchParams.get("google_auth");
    const userId = searchParams.get("user_id");

    if (error) {
      setErrors([decodeURIComponent(error)]);
    }

    if (googleAuth === "success" && userId) {
      // 구글 로그인 성공
      localStorage.setItem("userId", userId);
      router.push(`/home?userId=${userId}`);
      router.refresh();
    }
  }, [searchParams, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setIsLoading(true);

    // 유효성 검사 - 모든 에러를 수집
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
      const res = await fetch("/api/auth/login", {
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
        } else {
          setErrors([data.error || "로그인에 실패했습니다."]);
        }
        setIsLoading(false);
        return;
      }

      // 로그인 성공 - 유저 ID 저장 및 메인 페이지로 이동
      if (data.user?.id) {
        localStorage.setItem("userId", data.user.id);
        router.push(`/home?userId=${data.user.id}`);
      } else {
        router.push("/home");
      }
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      setErrors(["로그인 중 오류가 발생했습니다."]);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrors([]);

    try {
      window.location.href = `/api/auth/google?redirect_to=${encodeURIComponent("/home")}`;
    } catch (error) {
      console.error("Google login error:", error);
      setErrors(["구글 로그인 중 오류가 발생했습니다."]);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ backgroundColor: '#6983FC' }}>

      {/* 로고 영역 */}
      <div className="mb-12">
        <div className="flex items-center justify-center">
          <Image
            src={LOGO_PATHS.main}
            alt="OneChat Logo"
            width={192}
            height={182}
            className="drop-shadow-lg"
            style={{ width: "auto", height: "auto" }}
            priority
          />
        </div>
      </div>

      {/* 로그인 폼 */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleLogin} className="space-y-4">
          {/* 아이디 입력 */}
          <div className="w-full">
            <label className="block text-sm font-semibold mb-1.5 text-white">
              아이디
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력해주세요."
              className="w-full h-12 rounded-lg bg-blue-400/30 backdrop-blur-sm border-2 border-white px-4 placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
              style={{ color: '#FFFFFF' }}
            />
          </div>

          {/* 비밀번호 입력 */}
          <div className="w-full">
            <label className="block text-sm font-semibold mb-1.5 text-white">
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요."
                className="w-full h-12 rounded-lg bg-blue-400/30 backdrop-blur-sm border-2 border-white px-4 pr-12 placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
                style={{ color: '#FFFFFF' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* 로그인 버튼 */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-white hover:bg-gray-100 font-semibold rounded-md transition-colors"
            style={{ color: '#6983FC' }}
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </Button>

          {/* 링크 */}
          <div className="flex justify-center gap-2 text-sm">
            <Link
              href="/forgot-password"
              className="text-white/90 hover:text-white transition-colors font-medium"
            >
              비밀번호 찾기
            </Link>
            <span className="text-white/70">|</span>
            <Link
              href="/signup"
              className="text-white/90 hover:text-white transition-colors font-medium"
            >
              회원가입 하기
            </Link>
          </div>

          {/* 구분선 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-6 py-1 text-white font-medium" style={{ backgroundColor: '#6983FC' }}>또는</span>
            </div>
          </div>

          {/* Google 로그인 */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-white/30 border-2 border-white/10 hover:bg-white/40 hover:border-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-10 h-10"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 토스트 팝업 - 여러 개 표시 */}
      {errors.map((error, index) => (
        <Toast
          key={index}
          message={error}
          onClose={() => {
            setErrors((prev) => prev.filter((_, i) => i !== index));
          }}
          duration={1000}
          index={index}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ backgroundColor: '#6983FC' }}>
        <div className="text-white">로딩 중...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
