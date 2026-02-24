import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "아이디를 입력해주세요." },
        { status: 400 }
      );
    }

    // 아이디 중복 확인
    let result;
    try {
      result = await sql`
        SELECT id FROM users WHERE username = ${username} LIMIT 1
      `;
    } catch (dbError: any) {
      // 테이블이 없거나 데이터베이스 연결 오류인 경우
      console.error("Database query error:", dbError);
      
      // 테이블이 없는 경우 (relation "users" does not exist)
      if (dbError?.message?.includes("does not exist") || dbError?.message?.includes("relation")) {
        // 테이블이 없으면 사용 가능한 것으로 처리 (첫 사용자)
        return NextResponse.json({
          available: true,
        });
      }
      
      throw dbError; // 다른 에러는 다시 throw
    }

    // 결과가 배열인지 확인하고 처리
    const users = Array.isArray(result) ? result : [];
    
    return NextResponse.json({
      available: users.length === 0,
    });
  } catch (error: any) {
    console.error("Username check error:", error);
    // 더 자세한 에러 정보 로깅
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { 
        error: "아이디 확인 중 오류가 발생했습니다.",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
