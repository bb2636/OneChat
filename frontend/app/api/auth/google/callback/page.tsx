"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// 이 페이지는 URL 검색 파라미터를 사용하는 클라이언트 전용 페이지입니다.
// 정적 프리렌더링을 피하기 위해 동적 렌더링으로 설정합니다.
export const dynamic = "force-dynamic";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URL fragment에서 access_token 추출
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const error = params.get("error");
        const errorDescription = params.get("error_description");

        if (error) {
          console.error("OAuth error:", error, errorDescription);
          router.push(`/login?error=${encodeURIComponent("구글 로그인 중 오류가 발생했습니다.")}`);
          return;
        }

        if (!accessToken) {
          // code 파라미터 확인 (일부 경우 code로 반환될 수 있음)
          const code = searchParams.get("code");
          if (code) {
            // code가 있으면 Supabase로 세션 교환
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (sessionError || !sessionData.session) {
              console.error("Session exchange error:", sessionError);
              router.push(`/login?error=${encodeURIComponent("세션 생성에 실패했습니다.")}`);
              return;
            }
            
            // 세션이 이미 설정되었으므로 사용자 정보 처리로 진행
            const authUser = sessionData.user;
            if (!authUser) {
              router.push(`/login?error=${encodeURIComponent("사용자 정보를 가져올 수 없습니다.")}`);
              return;
            }
            
            // 사용자 정보 추출 및 처리로 진행
            const email = authUser.email;
            const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null;
            const avatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null;
            const providerId = authUser.id;
            
            if (!email) {
              router.push(`/login?error=${encodeURIComponent("구글 계정에서 이메일 정보를 가져올 수 없습니다.")}`);
              return;
            }
            
            // 서버로 사용자 정보 전송하여 처리
            const redirectTo = searchParams.get("redirect_to") || "/home";
            const response = await fetch("/api/auth/google/process", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                name,
                avatarUrl,
                providerId,
                redirectTo,
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              router.push(`/login?error=${encodeURIComponent(errorData.error || "구글 로그인 처리 중 오류가 발생했습니다.")}`);
              return;
            }
            
            const result = await response.json();
            
            if (result.redirectUrl) {
              window.location.href = result.redirectUrl;
            } else {
              router.push(redirectTo);
            }
            return;
          }
          
          router.push(`/login?error=${encodeURIComponent("구글 로그인 인증 코드가 없습니다.")}`);
          return;
        }

        // Supabase 세션 설정
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        });

        if (sessionError || !sessionData.session) {
          console.error("Session error:", sessionError);
          router.push(`/login?error=${encodeURIComponent("세션 생성에 실패했습니다.")}`);
          return;
        }

        const authUser = sessionData.user;
        if (!authUser) {
          router.push(`/login?error=${encodeURIComponent("사용자 정보를 가져올 수 없습니다.")}`);
          return;
        }

        // 사용자 정보 추출
        const email = authUser.email;
        const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null;
        const avatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null;
        const providerId = authUser.id;

        if (!email) {
          router.push(`/login?error=${encodeURIComponent("구글 계정에서 이메일 정보를 가져올 수 없습니다.")}`);
          return;
        }

        // 서버로 사용자 정보 전송하여 처리
        const redirectTo = searchParams.get("redirect_to") || "/home";
        const response = await fetch("/api/auth/google/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name,
            avatarUrl,
            providerId,
            redirectTo,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          router.push(`/login?error=${encodeURIComponent(errorData.error || "구글 로그인 처리 중 오류가 발생했습니다.")}`);
          return;
        }

        const result = await response.json();
        
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else {
          router.push(redirectTo);
        }
      } catch (error) {
        console.error("Google callback error:", error);
        router.push(`/login?error=${encodeURIComponent("구글 로그인 처리 중 오류가 발생했습니다.")}`);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">구글 로그인 처리 중...</p>
      </div>
    </div>
  );
}
