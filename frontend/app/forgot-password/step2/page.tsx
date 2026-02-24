"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { cn } from "@/lib/cn";

export default function ForgotPasswordStep2Page() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    // 세션에서 아이디 가져오기
    const storedUsername = sessionStorage.getItem("forgot_password_username");
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      // 아이디가 없으면 1단계로 리다이렉트
      router.push("/forgot-password");
    }
  }, [router]);

  // 휴대폰 번호 포맷팅 (010-0000-0000)
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7)
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber || phoneNumber.replace(/[^\d]/g, "").length !== 11) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          phoneNumber: phoneNumber.replace(/[^\d]/g, ""),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "인증번호 전송에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 2단계 데이터 저장
      sessionStorage.setItem(
        "forgot_password_step2",
        JSON.stringify({
          username,
          phoneNumber: phoneNumber.replace(/[^\d]/g, ""),
        })
      );

      // 다음 단계로 이동
      router.push("/forgot-password/step3");
    } catch (error) {
      console.error("Send code error:", error);
      alert("인증번호 전송 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  const isPhoneValid = phoneNumber.replace(/[^\d]/g, "").length === 11;

  return (
    <div className="min-h-screen bg-white flex flex-col px-4 py-8">
      {/* 헤더 */}
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-900 text-3xl font-normal">
          &lt;
        </button>
        <h1 className="text-lg font-normal text-gray-900 flex-1 text-center">비밀번호 찾기</h1>
        <div className="text-sm text-gray-500 pt-0.5">2/4</div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 max-w-sm mx-auto w-full pb-24">
        <p className="text-gray-900 text-lg font-semibold mb-8">
          인증에 필요한 휴대폰 번호를 입력해주세요
        </p>

        <form onSubmit={handleSendCode} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              휴대폰 번호
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="휴대폰 번호를 입력해주세요."
              className="w-full h-12 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 text-sm placeholder:text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              maxLength={13} // 010-0000-0000
            />
          </div>
        </form>
      </div>

      {/* 다음 버튼 - 최하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-4 py-4 border-t border-gray-200">
        <Button
          type="submit"
          disabled={!isPhoneValid || isLoading}
          onClick={handleSendCode}
          className={cn(
            "w-full font-medium h-12 rounded-lg transition-colors",
            isPhoneValid
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          )}
        >
          {isLoading ? "전송 중..." : "인증번호 전송"}
        </Button>
      </div>
    </div>
  );
}
