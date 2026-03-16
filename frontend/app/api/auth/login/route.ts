import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken, createTokenCookieHeader } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    console.log("Login attempt for username:", username);

    if (!username || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 데이터베이스 쿼리 실행
    let users;
    try {
      users = await sql`
        SELECT id, username, password, nickname, email, name, avatar_url, role
        FROM users
        WHERE username = ${username}
        LIMIT 1
      `;
    } catch (dbError: any) {
      console.error("Database query error:", dbError);
      
      // Supabase 연결 풀러 오류 처리
      if (dbError?.message?.includes("Tenant or user not found") || 
          dbError?.code === "XX000" ||
          dbError?.message?.includes("connection")) {
        console.error("Database connection error - possibly pgbouncer issue");
        return NextResponse.json(
          { 
            error: "데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
            details: process.env.NODE_ENV === "development" ? dbError?.message : undefined
          },
          { status: 503 } // Service Unavailable
        );
      }
      
      // 데이터베이스 연결 오류 또는 테이블이 없는 경우
      if (dbError?.message?.includes("does not exist") || dbError?.message?.includes("relation")) {
        return NextResponse.json(
          { error: "데이터베이스 테이블이 존재하지 않습니다." },
          { status: 500 }
        );
      }
      throw dbError; // 다른 에러는 다시 throw
    }

    // 결과가 배열인지 확인하고 처리
    const usersArray = Array.isArray(users) ? users : [];

    if (usersArray.length === 0) {
      return NextResponse.json(
        { error: "가입된 계정 정보가 없습니다." },
        { status: 404 }
      );
    }

    const user = usersArray[0];
    
    console.log("User found:", { 
      id: user.id, 
      username: user.username,
      hasPassword: !!user.password,
      passwordLength: user.password?.length 
    });

    if (!user.password) {
      return NextResponse.json(
        { error: "비밀번호가 설정되지 않았습니다." },
        { status: 401 }
      );
    }

    // 비밀번호 검증
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch (bcryptError: any) {
      console.error("Bcrypt compare error:", bcryptError);
      return NextResponse.json(
        { 
          error: "비밀번호 검증 중 오류가 발생했습니다.",
          details: process.env.NODE_ENV === "development" ? bcryptError?.message : undefined
        },
        { status: 500 }
      );
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    // 토큰 생성
    let token: string;
    try {
      const userId = String(user.id); // UUID를 문자열로 변환
      const userRole = user.role || "user";
      console.log("Generating token for:", { userId, role: userRole });
      token = signToken({ userId, role: userRole });
    } catch (tokenError: any) {
      console.error("Token generation error:", tokenError);
      console.error("Token error details:", {
        message: tokenError?.message,
        stack: tokenError?.stack,
        userId: user.id,
        userIdType: typeof user.id
      });
      return NextResponse.json(
        { 
          error: "토큰 생성 중 오류가 발생했습니다.",
          details: process.env.NODE_ENV === "development" ? tokenError?.message : undefined
        },
        { status: 500 }
      );
    }

    // 응답 생성
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });

    // 쿠키 설정
    try {
      response.headers.set("Set-Cookie", createTokenCookieHeader(token));
    } catch (cookieError: any) {
      console.error("Cookie setting error:", cookieError);
      // 쿠키 설정 실패해도 응답은 반환 (토큰은 생성되었으므로)
    }

    return response;
  } catch (error) {
    console.error("=== Login Error ===");
    console.error("Error message:", error instanceof Error ? error.message : "알 수 없는 오류");
    console.error("Error stack:", error instanceof Error ? error.stack : undefined);
    console.error("Error name:", error instanceof Error ? error.name : undefined);
    if (error && typeof error === 'object') {
      try {
        console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch {
        console.error("Full error (stringified):", String(error));
      }
    }
    console.error("===================");
    
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json(
      { 
        error: "로그인 중 오류가 발생했습니다.",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
