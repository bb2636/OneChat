"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

export default function ForgotPasswordStep4Page() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 세션에서 인증 정보 확인
    const step3Data = sessionStorage.getItem("forgot_password_step3");
    if (!step3Data) {
      router.push("/forgot-password");
    }
  }, [router]);

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
    if (!password.trim()) {
      setPasswordError("비밀번호를 입력해주세요.");
      return;
    }
    if (password.length < 8) {
      setPasswordError("비밀번호를 8자 이상 입력해주세요.");
      return;
    }
    if (!confirmPassword.trim()) {
      setConfirmPasswordError("비밀번호 확인을 입력해주세요.");
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (passwordError || confirmPasswordError) {
      return;
    }

    setIsLoading(true);

    try {
      const step3Data = sessionStorage.getItem("forgot_password_step3");
      if (!step3Data) {
        alert("인증 정보를 찾을 수 없습니다.");
        router.push("/forgot-password");
        return;
      }

      const data = JSON.parse(step3Data);

      // 비밀번호 재설정 API 호출
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          phoneNumber: data.phoneNumber,
          newPassword: password,
        }),
      });

      const resetData = await res.json();

      if (!res.ok) {
        alert(resetData.error || "비밀번호 재설정에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 세션 스토리지 정리
      sessionStorage.removeItem("forgot_password_username");
      sessionStorage.removeItem("forgot_password_step2");
      sessionStorage.removeItem("forgot_password_step3");

      // 완료 페이지로 이동
      router.push("/forgot-password/complete");
    } catch (error) {
      console.error("Reset password error:", error);
      alert("비밀번호 재설정 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  const isFormValid =
    password.trim() &&
    confirmPassword.trim() &&
    password.length >= 8 &&
    password === confirmPassword &&
    !passwordError &&
    !confirmPasswordError;

  return (
    <div className="min-h-screen bg-white flex flex-col px-4 py-8">
      {/* 헤더 */}
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-900 text-3xl font-normal">
          &lt;
        </button>
        <h1 className="text-lg font-normal text-gray-900 flex-1 text-center">비밀번호 찾기</h1>
        <div className="text-sm text-gray-500 pt-0.5">4/4</div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 max-w-sm mx-auto w-full pb-24">
        <p className="text-gray-900 text-lg font-semibold mb-8">
          변경하실 비밀번호를 입력해주세요
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 비밀번호 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              새 비밀번호
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
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              비밀번호 확인
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                placeholder="비밀번호를 한번 더 입력해주세요."
                className={cn(
                  "w-full h-12 rounded-lg border px-4 pr-12 text-gray-900 text-sm placeholder:text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                  confirmPasswordError || passwordError
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
      </div>

      {/* 재설정 버튼 - 최하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-4 py-4 border-t border-gray-200">
        <Button
          type="submit"
          disabled={!isFormValid || isLoading}
          onClick={handleSubmit}
          className={cn(
            "w-full font-medium h-12 rounded-lg transition-colors",
            isFormValid
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          )}
        >
          {isLoading ? "처리 중..." : "비밀번호 재설정"}
        </Button>
      </div>
    </div>
  );
}
