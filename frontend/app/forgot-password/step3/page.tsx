"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

export default function ForgotPasswordStep3Page() {
  const router = useRouter();
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(300); // 5분 = 300초
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const codeRef = useRef<string[]>(["", "", "", "", "", ""]);

  useEffect(() => {
    // 세션에서 전화번호 가져오기
    const step2Data = sessionStorage.getItem("forgot_password_step2");
    if (step2Data) {
      const data = JSON.parse(step2Data);
      setPhoneNumber(data.phoneNumber || "");
    }

    // 타이머 시작
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 시간 포맷팅 (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // 전화번호 포맷팅 (010-0000-0000)
  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  // 인증번호 입력 처리
  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/[^\d]/g, "").slice(-1);
    const newCode = [...codeRef.current];
    newCode[index] = digit;
    codeRef.current = newCode;
    setCode(newCode);

    // 다음 입력칸으로 자동 포커스
    if (digit && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/[^\d]/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = Array.from({ length: 6 }, (_, i) => pasted[i] || "");
    codeRef.current = next;
    setCode(next);

    const focusIndex = Math.min(pasted.length, 6) - 1;
    if (focusIndex >= 0) {
      const input = document.getElementById(`code-${focusIndex}`);
      input?.focus();
    }
  };

  // 백스페이스 처리
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  // 인증번호 재전송
  const handleResend = async () => {
    if (!phoneNumber) return;

    const step2Data = sessionStorage.getItem("forgot_password_step2");
    if (!step2Data) return;

    const data = JSON.parse(step2Data);

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          phoneNumber: phoneNumber,
        }),
      });

      if (res.ok) {
        setTimeLeft(300); // 타이머 리셋
        const empty = ["", "", "", "", "", ""];
        codeRef.current = empty;
        setCode(empty);
        alert("인증번호가 재전송되었습니다.");
      } else {
        alert("인증번호 재전송에 실패했습니다.");
      }
    } catch (error) {
      console.error("Resend error:", error);
      alert("인증번호 재전송 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 인증 확인
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const verificationCode = codeRef.current.join("");
    if (verificationCode.length !== 6) {
      return;
    }

    setIsLoading(true);

    try {
      const step2Data = sessionStorage.getItem("forgot_password_step2");
      if (!step2Data) {
        alert("인증 정보를 찾을 수 없습니다.");
        router.push("/forgot-password");
        return;
      }

      const data = JSON.parse(step2Data);

      const res = await fetch("/api/auth/forgot-password/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          phoneNumber: phoneNumber,
          code: verificationCode,
        }),
      });

      const verifyData = await res.json();

      if (!res.ok) {
        alert(verifyData.error || "인증에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 3단계 데이터 저장
      sessionStorage.setItem(
        "forgot_password_step3",
        JSON.stringify({
          ...data,
          phoneVerified: true,
        })
      );

      // 다음 단계로 이동
      router.push("/forgot-password/step4");
    } catch (error) {
      console.error("Verify error:", error);
      alert("인증 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  const isCodeComplete = code.every((digit) => digit !== "");
  const isTimerActive = timeLeft > 0;

  return (
    <div className="min-h-screen bg-white flex flex-col px-4 py-8">
      {/* 헤더 */}
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-900 text-3xl font-normal">
          &lt;
        </button>
        <h1 className="text-lg font-normal text-gray-900 flex-1 text-center">비밀번호 찾기</h1>
        <div className="text-sm text-gray-500 pt-0.5">3/4</div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 max-w-sm mx-auto w-full pb-24">
        <p className="text-gray-900 text-lg font-semibold mb-8">
          인증번호를 입력해주세요
        </p>
        {phoneNumber && (
          <p className="text-gray-700 text-sm mb-6">
            {formatPhone(phoneNumber)}로 인증번호를 전송했습니다.
          </p>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          {/* 인증번호 입력 필드 */}
          <div className="flex justify-between gap-2">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onPaste={handleCodePaste}
                onKeyDown={(e) => handleKeyDown(index, e)}
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                pattern="[0-9]*"
                className="w-12 h-12 text-center text-xl font-bold rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            ))}
          </div>

          {/* 타이머 및 재전송 */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className={cn(timeLeft <= 60 ? "text-red-500 font-medium" : "")}>
              남은 시간 {formatTime(timeLeft)}
            </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading || !isTimerActive}
              className={cn(
                "font-medium underline",
                isLoading || !isTimerActive
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-500 hover:text-blue-600"
              )}
            >
              인증번호 재전송
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            인증번호 문자가 오지 않나요? 인증번호 재전송을 눌러 다시 시도해주세요.
          </p>
        </form>
      </div>

      {/* 인증하기 버튼 - 최하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-4 py-4 border-t border-gray-200">
        <Button
          type="submit"
          disabled={!isCodeComplete || isLoading || !isTimerActive}
          onClick={handleVerify}
          className={cn(
            "w-full font-medium h-12 rounded-lg transition-colors",
            isCodeComplete && isTimerActive
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          )}
        >
          {isLoading ? "인증 중..." : "인증하기"}
        </Button>
      </div>
    </div>
  );
}
