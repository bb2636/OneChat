"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

export default function SignupStep4Page() {
  const router = useRouter();
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(300); // 5분 = 300초
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const codeRef = useRef<string[]>(["", "", "", "", "", ""]);

  useEffect(() => {
    // 세션에서 전화번호 가져오기
    const step3Data = sessionStorage.getItem("signup_step3");
    if (step3Data) {
      const data = JSON.parse(step3Data);
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

  // 인증번호 입력 핸들러
  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/[^\d]/g, "").slice(-1);
    const newCode = [...codeRef.current];
    newCode[index] = digit;
    codeRef.current = newCode;
    setCode(newCode);

    // 다음 입력란으로 자동 이동
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

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
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
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          code: verificationCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "인증에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 4단계 데이터 저장
      const step3Data = sessionStorage.getItem("signup_step3");
      if (step3Data) {
        const step4Data = {
          ...JSON.parse(step3Data),
          phoneVerified: true,
        };
        sessionStorage.setItem("signup_step4", JSON.stringify(step4Data));
      }

      // 다음 단계로 이동
      router.push("/signup/step5");
    } catch (error) {
      console.error("Verify error:", error);
      alert("인증 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  const isCodeComplete = code.every((digit) => digit !== "");

  return (
    <div className="min-h-screen bg-white flex flex-col px-4 py-8">
      {/* 헤더 */}
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-900 text-3xl font-normal">
          &lt;
        </button>
        <h1 className="text-lg font-normal text-gray-900 flex-1 text-center">회원가입</h1>
        <div className="text-sm text-gray-500">4/5</div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 max-w-sm mx-auto w-full">
        <p className="text-gray-700 mb-4">인증번호를 입력해주세요</p>
        {phoneNumber && (
          <p className="text-sm text-gray-600 mb-8">
            {formatPhone(phoneNumber)}로 인증번호를 전송했습니다.
          </p>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          {/* 인증번호 입력 */}
          <div className="flex justify-center gap-2 mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onPaste={handleCodePaste}
                onKeyDown={(e) => handleKeyDown(index, e)}
                autoComplete={index === 0 ? "one-time-code" : "off"}
                pattern="[0-9]*"
                className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
              />
            ))}
          </div>

          {/* 타이머 및 재전송 */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">
              남은 시간 {formatTime(timeLeft)}
            </span>
            <button
              type="button"
              onClick={handleResend}
              className="text-sm text-blue-500 underline"
            >
              인증번호 재전송
            </button>
          </div>

          {/* 도움말 */}
          <div className="text-xs text-gray-500 space-y-1 mb-6">
            <p>인증번호 문자가 오지 않나요?</p>
            <p>인증번호 재전송를 눌러 다시 시도해주세요.</p>
          </div>

          {/* 인증하기 버튼 */}
          <Button
            type="submit"
            disabled={!isCodeComplete || timeLeft === 0 || isLoading}
            className={cn(
              "w-full font-medium py-3 rounded-lg",
              isCodeComplete && timeLeft > 0
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            )}
          >
            {isLoading ? "인증 중..." : "인증하기"}
          </Button>
        </form>
      </div>
    </div>
  );
}
