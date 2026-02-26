"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import Link from "next/link";

interface Term {
  id: string;
  type: string;
  title: string;
  content: string;
  isRequired: boolean;
}

export default function SignupStep5Page() {
  const router = useRouter();
  const [terms, setTerms] = useState<Term[]>([]);
  const [agreedTerms, setAgreedTerms] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTerms, setIsLoadingTerms] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);

  useEffect(() => {
    // 약관 불러오기
    const fetchTerms = async () => {
      try {
        const res = await fetch("/api/terms");
        const data = await res.json();

        if (res.ok) {
          setTerms(data);
        }
      } catch (error) {
        console.error("Terms fetch error:", error);
      } finally {
        setIsLoadingTerms(false);
      }
    };

    fetchTerms();
  }, []);

  // 모두 동의
  const handleAgreeAll = () => {
    if (agreedTerms.size === terms.length) {
      setAgreedTerms(new Set());
    } else {
      setAgreedTerms(new Set(terms.map((t) => t.id)));
    }
  };

  // 개별 약관 동의
  const handleToggleTerm = (termId: string) => {
    const newAgreed = new Set(agreedTerms);
    if (newAgreed.has(termId)) {
      newAgreed.delete(termId);
    } else {
      newAgreed.add(termId);
    }
    setAgreedTerms(newAgreed);
  };

  // 약관 상세 보기
  const handleViewDetails = (term: Term) => {
    setSelectedTerm(term);
  };

  // 최종 회원가입 완료
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();

    // 모든 약관 동의 확인 (모두 필수)
    const allRequiredAgreed = terms.length > 0 && terms.every((t) =>
      agreedTerms.has(t.id)
    );

    if (!allRequiredAgreed) {
      alert("필수 약관에 모두 동의해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      // 모든 단계 데이터 수집
      const step4Data = sessionStorage.getItem("signup_step4");
      if (!step4Data) {
        alert("회원가입 정보를 찾을 수 없습니다.");
        router.push("/signup");
        return;
      }

      const signupData = JSON.parse(step4Data);

      // 최종 회원가입 API 호출
      const res = await fetch("/api/auth/signup-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...signupData,
          agreedTermIds: Array.from(agreedTerms),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "회원가입에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 세션 스토리지 정리
      sessionStorage.removeItem("signup_step1");
      sessionStorage.removeItem("signup_step2");
      sessionStorage.removeItem("signup_step3");
      sessionStorage.removeItem("signup_step4");
      sessionStorage.removeItem("signup_google");

      // 구글 로그인 사용자는 자동 로그인 처리
      if (signupData.googleAuth && signupData.userId) {
        localStorage.setItem("userId", signupData.userId);
        router.push("/home");
        router.refresh();
      } else {
        // 일반 회원가입은 완료 페이지로 이동
        router.push("/signup/complete");
      }
    } catch (error) {
      console.error("Complete signup error:", error);
      alert("회원가입 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  const allAgreed = agreedTerms.size === terms.length && terms.length > 0;
  // 모든 약관을 필수로 처리
  const allRequiredAgreed = terms.length > 0 && terms.every((t) => agreedTerms.has(t.id));

  return (
    <div className="min-h-screen bg-white flex flex-col px-4 py-8">
      {/* 헤더 */}
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-900 text-3xl font-normal">
          &lt;
        </button>
        <h1 className="text-lg font-normal text-gray-900 flex-1 text-center">회원가입</h1>
        <div className="text-sm text-gray-500">5/5</div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 max-w-sm mx-auto w-full">
        <p className="text-gray-700 mb-8">
          서비스 이용약관을 확인하고 동의해주세요
        </p>

        {isLoadingTerms ? (
          <div className="text-center py-8">약관을 불러오는 중...</div>
        ) : (
          <form onSubmit={handleComplete} className="space-y-4">
            {/* 모두 동의 */}
            <div
              className="flex items-center gap-3 p-4 bg-white rounded-lg cursor-pointer"
              onClick={handleAgreeAll}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
                  allAgreed
                    ? "bg-blue-500 border-blue-500"
                    : "bg-white border-gray-300"
                )}
              >
                {allAgreed && <Check className="w-4 h-4 text-white" />}
              </div>
              <span
                className={cn(
                  "font-medium",
                  allAgreed ? "text-blue-500" : "text-gray-700"
                )}
              >
                모두 동의합니다.
              </span>
            </div>

            {/* 개별 약관 */}
            <div className="space-y-3">
              {terms.map((term) => (
                <div
                  key={term.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg"
                >
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => handleToggleTerm(term.id)}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
                        agreedTerms.has(term.id)
                          ? "bg-blue-500 border-blue-500"
                          : "bg-white border-gray-300"
                      )}
                    >
                      {agreedTerms.has(term.id) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="text-gray-900">
                      [필수] {term.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(term);
                    }}
                    className="text-sm text-gray-500 underline ml-2"
                  >
                    전문보기
                  </button>
                </div>
              ))}
            </div>

            {/* 동의하기 버튼 */}
            <Button
              type="submit"
              disabled={!allRequiredAgreed || isLoading}
              className={cn(
                "w-full font-medium py-3 rounded-lg mt-6",
                allRequiredAgreed
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              )}
            >
              {isLoading ? "처리 중..." : "동의하기"}
            </Button>
          </form>
        )}
      </div>

      {selectedTerm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelectedTerm(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">{selectedTerm.title}</h2>
              <button
                type="button"
                onClick={() => setSelectedTerm(null)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto px-5 py-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                {selectedTerm.content}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
