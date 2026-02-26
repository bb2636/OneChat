import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

// 동적 라우트로 설정 (정적 생성 방지)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get("redirect_to") || "/home";

    const supabase = getSupabaseServerClient();

    // Supabase Auth를 사용한 구글 OAuth 로그인
    const frontendOrigin = process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || "https://weoncaes.replit.app";
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${frontendOrigin}/api/auth/google/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Google OAuth error:", error);
      const errorUrl = new URL("/login", process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || "https://weoncaes.replit.app");
      errorUrl.searchParams.set("error", "구글 로그인 중 오류가 발생했습니다.");
      return NextResponse.redirect(errorUrl.toString());
    }

    // Supabase가 리다이렉트 URL을 반환
    if (data.url) {
      return NextResponse.redirect(data.url);
    }

    const errorUrl = new URL("/login", process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || "https://weoncaes.replit.app");
    errorUrl.searchParams.set("error", "구글 로그인 URL을 생성할 수 없습니다.");
    return NextResponse.redirect(errorUrl.toString());
  } catch (error) {
    console.error("Google login error:", error);
    const errorUrl = new URL("/login", process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || "https://weoncaes.replit.app");
    errorUrl.searchParams.set("error", "구글 로그인 중 오류가 발생했습니다.");
    return NextResponse.redirect(errorUrl.toString());
  }
}
