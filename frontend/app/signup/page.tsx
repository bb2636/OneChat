"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 아이디 중복 확인
  const checkUsername = async (value: string) => {
    if (!value.trim()) {
      setUsernameError(null);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(value)}`);
      const data = await res.json();

      if (res.ok && data.available) {
        setUsernameError(null);
      } else {
        setUsernameError("이미 가입된 아이디 입니다.");
      }
    } catch (error) {
      console.error("Username check error:", error);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // 비밀번호 유효성 검사
  const validatePassword = (value: string) => {
    if (value.length > 0 && value.length < 8) {
      setPasswordError("비밀번호를 8자 이상 입력해주세요.");
    } else {
      setPasswordError(null);
    }
  };

  // 비밀번호 확인 검사
  const validateConfirmPassword = (value: string) => {
    if (value && value !== password) {
      setConfirmPasswordError("비밀번호가 일치하지 않습니다.");
    } else if (value && value === password) {
      setConfirmPasswordError(null);
    } else {
      setConfirmPasswordError(null);
    }
  };

  // 아이디 변경 시 디바운싱하여 중복 확인
  useEffect(() => {
    if (!username.trim()) {
      setUsernameError(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkUsername(username);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    validatePassword(value);
    if (confirmPassword) {
      validateConfirmPassword(confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    validateConfirmPassword(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!username.trim()) {
      setUsernameError("아이디를 입력해주세요.");
      return;
    }
    if (!password.trim()) {
      setPasswordError("비밀번호를 입력해주세요.");
      return;
    }
    if (password.length < 8) {
      setPasswordError("비밀번호를 8자 이상 입력해주세요.");
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (usernameError) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setUsernameError("이미 가입된 아이디 입니다.");
        } else {
          setUsernameError(data.error || "아이디 확인에 실패했습니다.");
        }
        setIsLoading(false);
        return;
      }

      // 1단계 데이터를 세션 스토리지에 저장 (아이디 사용 가능 확인 완료)
      sessionStorage.setItem("signup_step1", JSON.stringify({ username, password }));

      // 다음 단계로 이동
      router.push("/signup/step2");
    } catch (error) {
      console.error("Signup error:", error);
      setUsernameError("아이디 확인 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  const isFormValid =
    username.trim() &&
    password.trim() &&
    confirmPassword.trim() &&
    password.length >= 8 &&
    password === confirmPassword &&
    !usernameError &&
    !passwordError &&
    !confirmPasswordError;

  return (
    <div className="min-h-screen bg-white flex flex-col px-4 py-8">
      {/* 헤더 */}
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-900 text-3xl font-normal">
          &lt;
        </button>
        <h1 className="text-lg font-normal text-gray-900 flex-1 text-center">회원가입</h1>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 max-w-sm mx-auto w-full">
        <div className="flex items-start justify-between mb-8">
          <p className="text-gray-900 text-lg font-semibold">
            가입하실 아이디와<br /> 
            비밀번호를 입력해주세요
          </p>
          <div className="text-sm text-gray-500 pt-0.5">1/5</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pb-24">
          {/* 아이디 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              아이디
            </label>
            <input
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="아이디를 입력해주세요."
              className={cn(
                "w-full h-12 rounded-lg border px-4 text-gray-900 text-sm placeholder:text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                usernameError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 bg-white"
              )}
            />
            {username && !usernameError && !isCheckingUsername && (
              <p className="mt-1.5 text-sm text-blue-500">
                사용가능한 아이디 입니다.
              </p>
            )}
            {usernameError && (
              <p className="mt-1.5 text-sm text-red-500">{usernameError}</p>
            )}
          </div>

          {/* 비밀번호 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                placeholder="비밀번호를 입력해주세요."
                className={cn(
                  "w-full h-12 rounded-lg border px-4 pr-12 text-gray-900 text-sm placeholder:text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                  passwordError
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 bg-white"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* 비밀번호 확인 */}
          <div className="!mt-3">
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                placeholder="비밀번호를 한번 더 입력해주세요."
                className={cn(
                  "w-full h-12 rounded-lg border px-4 pr-12 text-gray-900 text-sm placeholder:text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                  confirmPasswordError
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 bg-white"
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {/* 비밀번호 유효성 검사 메시지 - 비밀번호 확인 입력칸 아래에 표시 */}
            {passwordError && (
              <p className="mt-1.5 text-sm text-red-500">{passwordError}</p>
            )}
            {confirmPassword && !confirmPasswordError && password === confirmPassword && (
              <p className="mt-1.5 text-sm text-blue-500">
                비밀번호가 일치합니다.
              </p>
            )}
            {confirmPasswordError && (
              <p className="mt-1.5 text-sm text-red-500">{confirmPasswordError}</p>
            )}
          </div>
        </form>

        {/* 다음 버튼 - 최하단 고정 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white px-4 py-4 border-t border-gray-200">
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
            className={cn(
              "w-full font-medium h-12 rounded-lg transition-colors",
              isFormValid
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            )}
          >
            {isLoading ? "처리 중..." : "다음"}
          </Button>
        </div>
      </div>
    </div>
  );
}
