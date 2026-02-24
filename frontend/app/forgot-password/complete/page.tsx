"use client";

import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

export default function ForgotPasswordCompletePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          {/* 파란색 방패 아이콘 */}
          <div className="mx-auto mb-8 flex w-full justify-center">
            <Shield className="w-28 h-28 text-blue-500" fill="currentColor" />
          </div>
          
          {/* 메시지 */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            비밀번호가 재설정되었습니다.
          </h2>
          <p className="text-base text-gray-700">
            새 비밀번호로 로그인 할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="pb-12 text-center">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm font-semibold text-blue-600"
        >
          홈으로
        </button>
      </div>
    </div>
  );
}
