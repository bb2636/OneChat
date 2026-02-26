import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verificationCodes, generateCode } from "@/app/api/auth/verification-store";

export async function POST(request: Request) {
  try {
    const { username, phoneNumber } = await request.json();

    // 전화번호 정규화 (숫자만 추출)
    const normalizedPhone = phoneNumber.replace(/[^\d]/g, "");

    if (!username || !normalizedPhone || normalizedPhone.length !== 11) {
      return NextResponse.json(
        { error: "아이디와 올바른 휴대폰 번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 사용자 조회 및 전화번호 확인
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
        { error: "아이디와 전화번호가 일치하지 않습니다." },
        { status: 404 }
      );
    }

    // 인증번호 생성
    const code = generateCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5분 후 만료

    // 인증번호 저장 (실제로는 SMS 발송)
    verificationCodes.set(normalizedPhone, { code, expiresAt });

    // 개발 환경에서는 콘솔에 출력 (실제로는 SMS 발송)
    const expireTime = new Date(expiresAt).toLocaleTimeString("ko-KR");
    console.log("\n========================================");
    console.log("📱 비밀번호 찾기 인증번호 전송 (개발 모드)");
    console.log("========================================");
    console.log(`아이디: ${username}`);
    console.log(`전화번호: ${normalizedPhone}`);
    console.log(`인증번호: ${code}`);
    console.log(`만료 시간: ${expireTime} (5분 후)`);
    console.log("========================================\n");

    // 5분 후 자동 삭제
    setTimeout(() => {
      if (verificationCodes.has(normalizedPhone)) {
        verificationCodes.delete(normalizedPhone);
        console.log(`[인증번호 만료] ${normalizedPhone}의 인증번호가 삭제되었습니다.`);
      }
    }, 5 * 60 * 1000);

    return NextResponse.json({
      message: "인증번호가 전송되었습니다.",
      // 개발 환경에서만 코드 반환 (실제로는 제거)
      ...(process.env.NODE_ENV === "development" && { code }),
    });
  } catch (error) {
    console.error("Send verification error:", error);
    return NextResponse.json(
      { error: "인증번호 전송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
