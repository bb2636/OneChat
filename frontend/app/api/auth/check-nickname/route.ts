import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nickname = searchParams.get("nickname");

    if (!nickname) {
      return NextResponse.json(
        { error: "닉네임을 입력해주세요." },
        { status: 400 }
      );
    }

    // 닉네임 중복 확인
    let result: Array<{ id: string }> | unknown;
    try {
      result = await sql`
        SELECT id FROM users WHERE nickname = ${nickname} LIMIT 1
      `;
    } catch (dbError: any) {
      console.error("Database query error:", dbError);
      // 테이블이 없는 경우는 첫 사용자로 처리
      if (dbError?.message?.includes("does not exist") || dbError?.message?.includes("relation")) {
        result = [];
      } else {
        throw dbError;
      }
    }

    // 결과가 배열인지 확인
    const usersArray = Array.isArray(result) ? result : [];

    return NextResponse.json({
      available: usersArray.length === 0,
    });
  } catch (error: any) {
    console.error("Nickname check error:", error);
    return NextResponse.json(
      { 
        error: "닉네임 확인 중 오류가 발생했습니다.",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
