"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
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

        let verifiedAccessToken: string | null = accessToken;

        if (!accessToken) {
          const code = searchParams.get("code");
          if (code) {
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (sessionError || !sessionData.session) {
              console.error("Session exchange error:", sessionError);
              router.push(`/login?error=${encodeURIComponent("세션 생성에 실패했습니다.")}`);
              return;
            }
            
            verifiedAccessToken = sessionData.session.access_token;
          } else {
            router.push(`/login?error=${encodeURIComponent("구글 로그인 인증 코드가 없습니다.")}`);
            return;
          }
        } else {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });
        }

        if (!verifiedAccessToken) {
          router.push(`/login?error=${encodeURIComponent("인증 토큰을 가져올 수 없습니다.")}`);
          return;
        }

        const redirectTo = searchParams.get("redirect_to") || "/home";
        const response = await fetch("/api/auth/google/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: verifiedAccessToken,
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
