import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { signToken, createTokenCookieHeader, signGoogleSignupToken, createGoogleSignupCookieHeader } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { accessToken, redirectTo } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "인증 토큰이 필요합니다." },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      console.error("supabaseAdmin is not configured (SUPABASE_SERVICE_ROLE_KEY missing)");
      return NextResponse.json(
        { error: "서버 설정 오류입니다." },
        { status: 500 }
      );
    }

    const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.getUser(accessToken);

    if (supabaseError || !supabaseUser?.user) {
      console.error("Supabase token verification failed:", supabaseError);
      return NextResponse.json(
        { error: "유효하지 않은 인증 토큰입니다." },
        { status: 401 }
      );
    }

    const verifiedUser = supabaseUser.user;
    const email = verifiedUser.email;
    const name = verifiedUser.user_metadata?.full_name || verifiedUser.user_metadata?.name || null;
    const avatarUrl = verifiedUser.user_metadata?.avatar_url || verifiedUser.user_metadata?.picture || null;
    const providerId = verifiedUser.id;

    if (!email) {
      return NextResponse.json(
        { error: "구글 계정에서 이메일 정보를 가져올 수 없습니다." },
        { status: 400 }
      );
    }

    const existingUser = await sql`
      SELECT id, username, nickname, phone_number, phone_verified, email
      FROM users
      WHERE email = ${email} OR id = ${providerId}
      LIMIT 1
    `;

    if (existingUser.length > 0) {
      const userId = existingUser[0].id;
      const nickname = existingUser[0].nickname;
      const phoneNumber = existingUser[0].phone_number;
      const phoneVerified = existingUser[0].phone_verified;

      await sql`
        UPDATE users
        SET 
          email = COALESCE(${email}, email),
          username = CASE WHEN username IS NULL OR username = '' THEN ${email || null} ELSE username END,
          name = CASE WHEN name IS NULL OR name = '' THEN COALESCE(${name}, name) ELSE name END,
          avatar_url = CASE WHEN avatar_url IS NULL OR avatar_url = '' THEN COALESCE(${avatarUrl}, avatar_url) ELSE avatar_url END,
          updated_at = NOW()
        WHERE id = ${userId}
      `;

      const hasRequiredInfo = nickname && phoneNumber && phoneVerified;

      if (!hasRequiredInfo) {
        const frontendOrigin = process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || "https://weoncaes.replit.app";
        const signupUrl = new URL("/signup/step2", frontendOrigin);
        signupUrl.searchParams.set("google_auth", "true");

        const signupToken = signGoogleSignupToken({ providerId: userId, email, name, avatarUrl });

        const response = NextResponse.json({ redirectUrl: signupUrl.toString() });
        response.headers.set("Set-Cookie", createGoogleSignupCookieHeader(signupToken));
        return response;
      }

      const userRole = await sql`SELECT role FROM users WHERE id = ${userId} LIMIT 1`;
      const role = userRole.length > 0 ? (userRole[0].role || "user") : "user";
      const token = signToken({ userId, role });

      const frontendOrigin = process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || "https://weoncaes.replit.app";
      const redirectUrl = new URL(redirectTo || "/home", frontendOrigin);
      redirectUrl.searchParams.set("google_auth", "success");
      redirectUrl.searchParams.set("user_id", userId);

      const response = NextResponse.json({ redirectUrl: redirectUrl.toString() });
      response.headers.set("Set-Cookie", createTokenCookieHeader(token));
      return response;
    } else {
      const frontendOrigin = process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || "https://weoncaes.replit.app";
      const signupUrl = new URL("/signup/step2", frontendOrigin);
      signupUrl.searchParams.set("google_auth", "true");

      const signupToken = signGoogleSignupToken({ providerId, email, name, avatarUrl });

      const response = NextResponse.json({ redirectUrl: signupUrl.toString() });
      response.headers.set("Set-Cookie", createGoogleSignupCookieHeader(signupToken));
      return response;
    }
  } catch (error) {
    console.error("Google process error:", error);
    return NextResponse.json(
      { error: "구글 로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
