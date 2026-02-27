import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, name, avatarUrl, providerId, redirectTo } = await request.json();

    if (!email || !providerId) {
      return NextResponse.json(
        { error: "필수 정보가 없습니다." },
        { status: 400 }
      );
    }

    // 기존 users 테이블에서 이메일 또는 Supabase Auth ID로 사용자 찾기
    let existingUser: Array<{ 
      id: string; 
      username: string | null; 
      nickname: string | null; 
      phone_number: string | null;
      phone_verified: boolean;
      email: string | null;
    }> = [];
    try {
      existingUser = await sql`
        SELECT id, username, nickname, phone_number, phone_verified, email
        FROM users
        WHERE email = ${email} OR id = ${providerId}
        LIMIT 1
      `;
    } catch (dbError: any) {
      console.error("Database query error:", dbError);
    }

    let userId: string;
    let nickname: string | null = null;
    let phoneNumber: string | null = null;
    let phoneVerified: boolean = false;

    if (existingUser.length > 0) {
      // 기존 사용자가 있으면 정보 가져오기
      userId = existingUser[0].id;
      nickname = existingUser[0].nickname;
      phoneNumber = existingUser[0].phone_number;
      phoneVerified = existingUser[0].phone_verified;

      // 프로필 정보 업데이트 (사용자가 직접 설정한 값은 덮어쓰지 않음)
      try {
        await sql`
          UPDATE users
          SET 
            email = COALESCE(${email}, email),
            name = CASE WHEN name IS NULL OR name = '' THEN COALESCE(${name}, name) ELSE name END,
            avatar_url = CASE WHEN avatar_url IS NULL OR avatar_url = '' THEN COALESCE(${avatarUrl}, avatar_url) ELSE avatar_url END,
            updated_at = NOW()
          WHERE id = ${userId}
        `;
      } catch (updateError: any) {
        console.error("User update error:", updateError);
      }

      // 필수 정보 확인 (닉네임, 전화번호)
      const hasRequiredInfo = nickname && phoneNumber && phoneVerified;

      if (!hasRequiredInfo) {
        // 필수 정보가 없으면 회원가입 단계로 리다이렉트
        const signupUrl = new URL("/signup/step2", process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || "https://weoncaes.replit.app");
        signupUrl.searchParams.set("google_auth", "true");
        signupUrl.searchParams.set("user_id", userId);
        signupUrl.searchParams.set("email", email || "");
        signupUrl.searchParams.set("name", name || "");
        signupUrl.searchParams.set("avatar_url", avatarUrl || "");
        signupUrl.searchParams.set("nickname", nickname || "");
        signupUrl.searchParams.set("phone_number", phoneNumber || "");

        return NextResponse.json({ redirectUrl: signupUrl.toString() });
      }

      // 모든 필수 정보가 있으면 로그인 성공
      const redirectUrl = new URL(redirectTo || "/home", process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || "https://weoncaes.replit.app");
      redirectUrl.searchParams.set("google_auth", "success");
      redirectUrl.searchParams.set("user_id", userId);

      return NextResponse.json({ redirectUrl: redirectUrl.toString() });
    } else {
      // 새 사용자 - 회원가입 단계로 리다이렉트
      const signupUrl = new URL("/signup/step2", process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || "https://weoncaes.replit.app");
      signupUrl.searchParams.set("google_auth", "true");
      signupUrl.searchParams.set("user_id", providerId);
      signupUrl.searchParams.set("email", email || "");
      signupUrl.searchParams.set("name", name || "");
      signupUrl.searchParams.set("avatar_url", avatarUrl || "");

      return NextResponse.json({ redirectUrl: signupUrl.toString() });
    }
  } catch (error) {
    console.error("Google process error:", error);
    return NextResponse.json(
      { error: "구글 로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
