import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "비밀번호를 8자 이상 입력해주세요." },
        { status: 400 }
      );
    }

    // 아이디 중복 확인만 수행 (사용자 생성하지 않음)
    let existingUsers: Array<{ id: string }> | unknown;
    try {
      existingUsers = await sql`
        SELECT id FROM users WHERE username = ${username} LIMIT 1
      `;
    } catch (dbError: any) {
      console.error("Database query error (check existing):", dbError);
      // 테이블이 없는 경우는 첫 사용자로 처리
      if (dbError?.message?.includes("does not exist") || dbError?.message?.includes("relation")) {
        existingUsers = [];
      } else {
        throw dbError;
      }
    }

    // 결과가 배열인지 확인
    const usersArray = Array.isArray(existingUsers) ? existingUsers : [];
    
    if (usersArray.length > 0) {
      return NextResponse.json(
        { error: "이미 가입된 아이디 입니다." },
        { status: 409 }
      );
    }

    // 아이디 사용 가능 - 사용자 생성은 하지 않고 성공만 반환
    return NextResponse.json(
      {
        message: "아이디 사용 가능",
        available: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("=== Signup Check Error ===");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    console.error("Error name:", error?.name);
    console.error("Full error:", JSON.stringify(error, null, 2));
    console.error("===================");
    
    return NextResponse.json(
      { 
        error: "아이디 확인 중 오류가 발생했습니다.",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
