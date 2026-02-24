"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupCompletePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
    

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <h2 className="text-2xl font-bold text-gray-900">
            가입이 완료 되었습니다.
          </h2>
          <p className="text-gray-700">
            주변을 둘러보며 가까워지는 순간, <br/>
            원챗이 시작됩니다.
          </p>
        </div>
      </div>

      {/* 로그인 화면 링크 */}
      <div className="pb-8 px-4">
        <Link
          href="/login"
          className="block text-center text-blue-500 font-medium py-4"
        >
          로그인 화면
        </Link>
      </div>
    </div>
  );
}
