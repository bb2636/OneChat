import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: "아이디를 입력해주세요." },
        { status: 400 }
      );
    }

    // 아이디로 사용자 조회
    let result: Array<{ id: string; username: string; phone_number: string | null }> | unknown;
    try {
      result = await sql`
        SELECT id, username, phone_number
        FROM users
        WHERE username = ${username}
        LIMIT 1
      `;
    } catch (dbError: any) {
      console.error("Database query error:", dbError);
      if (dbError?.message?.includes("does not exist") || dbError?.message?.includes("relation")) {
        result = [];
      } else {
        throw dbError;
      }
    }

    const usersArray = Array.isArray(result) ? result : [];

    if (usersArray.length === 0) {
      return NextResponse.json(
        { error: "가입된 아이디가 없습니다." },
        { status: 404 }
      );
    }

    const user = usersArray[0];

    // 전화번호가 등록되어 있는지 확인
    if (!user.phone_number) {
      return NextResponse.json(
        { error: "등록된 전화번호가 없습니다. 관리자에게 문의해주세요." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "아이디 확인 완료",
    });
  } catch (error: any) {
    console.error("Check username error:", error);
    return NextResponse.json(
      {
        error: "아이디 확인 중 오류가 발생했습니다.",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
