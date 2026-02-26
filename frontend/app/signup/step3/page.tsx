"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { cn } from "@/lib/cn";

export default function SignupStep3Page() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.replace(/[^\d]/g, "") }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "인증번호 전송에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 3단계 데이터 저장
      const step2Data = sessionStorage.getItem("signup_step2");
      if (step2Data) {
        const step3Data = {
          ...JSON.parse(step2Data),
          phoneNumber: phoneNumber.replace(/[^\d]/g, ""),
        };
        sessionStorage.setItem("signup_step3", JSON.stringify(step3Data));
      }

      // 다음 단계로 이동
      router.push("/signup/step4");
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
        <h1 className="text-lg font-normal text-gray-900 flex-1 text-center">회원가입</h1>
        <div className="text-sm text-gray-500">3/5</div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 max-w-sm mx-auto w-full">
        <p className="text-gray-700 mb-8">
          인증에 필요한 휴대폰 번호를 입력해주세요
        </p>

        <form onSubmit={handleSendCode} className="space-y-6">
          {/* 휴대폰 번호 입력 */}
          <Input
            label="휴대폰 번호"
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder="휴대폰 번호를 입력해주세요."
            className="bg-white"
            maxLength={13}
          />

          {/* 인증번호 전송 버튼 */}
          <Button
            type="submit"
            disabled={!isPhoneValid || isLoading}
            className={cn(
              "w-full font-medium py-3 rounded-lg",
              isPhoneValid
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            )}
          >
            {isLoading ? "전송 중..." : "인증번호 전송"}
          </Button>
        </form>
      </div>
    </div>
  );
}
