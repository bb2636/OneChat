"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

export default function ForgotPasswordCompletePage() {
  const router = useRouter();

  useEffect(() => {
    // 3초 후 로그인 페이지로 자동 이동
    const timer = setTimeout(() => {
      router.push("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          {/* 파란색 방패 아이콘 */}
          <div className="mx-auto mb-8">
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
    </div>
  );
}
