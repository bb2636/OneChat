import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyCode } from "@/app/api/auth/verification-store";

export async function POST(request: Request) {
  try {
    const { username, phoneNumber, code } = await request.json();

    if (!username || !phoneNumber || !code) {
      return NextResponse.json(
        { error: "아이디, 휴대폰 번호, 인증번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 전화번호 정규화 (숫자만 추출)
    const normalizedPhone = phoneNumber.replace(/[^\d]/g, "");
    const normalizedCode = String(code).replace(/[^\d]/g, "");

    if (normalizedCode.length !== 6) {
      return NextResponse.json(
        { error: "인증번호 6자리를 정확히 입력해주세요." },
        { status: 400 }
      );
    }

    // 디버깅 로그
    console.log("\n========================================");
    console.log("🔍 비밀번호 찾기 인증번호 확인 요청");
    console.log("========================================");
    console.log(`아이디: ${username}`);
    console.log(`전화번호: ${normalizedPhone}`);
    console.log(`입력된 인증번호: ${normalizedCode}`);
    console.log("========================================\n");

    // 인증번호 확인
    const isValid = verifyCode(normalizedPhone, normalizedCode);

    console.log(
      `[인증 확인] 아이디: ${username}, 전화번호: ${normalizedPhone}, 입력 코드: ${normalizedCode}, 결과: ${isValid ? "성공" : "실패"}`
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "인증번호가 일치하지 않거나 만료되었습니다." },
        { status: 401 }
      );
    }

    // 사용자 정보 확인
    let result: Array<{ id: string; username: string; phone_number: string | null }> | unknown;
    try {
      result = await sql`
        SELECT id, username, phone_number
        FROM users
        WHERE username = ${username} AND phone_number = ${normalizedPhone}
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
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      verified: true,
      message: "인증이 완료되었습니다.",
    });
  } catch (error) {
    console.error("Verify phone error:", error);
    return NextResponse.json(
      { error: "인증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
