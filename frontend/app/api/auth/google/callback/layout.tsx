import type { ReactNode } from "react";
import { Suspense } from "react";

export const metadata = {
  title: "Google 로그인 처리 중 | OneChat",
};

export default function GoogleCallbackLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">구글 로그인 처리 중...</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

