"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 기본 캐싱 전략
            staleTime: 2 * 60 * 1000, // 2분간 fresh 상태 유지
            gcTime: 10 * 60 * 1000, // 10분간 캐시 유지 (이전 cacheTime)
            refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 refetch 비활성화
            retry: 1, // 실패 시 1번만 재시도
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
