import { NextResponse } from "next/server";
import { verifyCode } from "../verification-store";

export async function POST(request: Request) {
  try {
    const { phoneNumber, code } = await request.json();

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: "휴대폰 번호와 인증번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 전화번호 정규화 (숫자만 추출)
    const normalizedPhone = phoneNumber.replace(/[^\d]/g, "");
    
    // 디버깅 로그
    console.log('\n========================================');
    console.log('🔍 인증번호 확인 요청');
    console.log('========================================');
    console.log(`원본 전화번호: ${phoneNumber}`);
    console.log(`정규화된 전화번호: ${normalizedPhone}`);
    console.log(`입력된 인증번호: ${code}`);
    console.log('========================================\n');

    // 인증번호 확인
    const isValid = verifyCode(normalizedPhone, code);

    console.log(`인증 결과: ${isValid ? '성공' : '실패'}`);

    if (!isValid) {
      return NextResponse.json(
        { error: "인증번호가 일치하지 않거나 만료되었습니다." },
        { status: 401 }
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
