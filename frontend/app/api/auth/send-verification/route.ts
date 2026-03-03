import { NextResponse } from "next/server";
import { verificationCodes } from "../verification-store";

// 6자리 랜덤 인증번호 생성
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();

    // 전화번호 정규화 (숫자만 추출)
    const normalizedPhone = phoneNumber.replace(/[^\d]/g, "");

    if (!normalizedPhone || normalizedPhone.length !== 11) {
      return NextResponse.json(
        { error: "올바른 휴대폰 번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 인증번호 생성
    const code = generateCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5분 후 만료

    // 인증번호 저장 (정규화된 전화번호로 저장)
    verificationCodes.set(normalizedPhone, { code, expiresAt });

    // 개발 환경에서는 콘솔에 출력 (실제로는 SMS 발송)
    const expireTime = new Date(expiresAt).toLocaleTimeString('ko-KR');
    console.log('\n========================================');
    console.log('📱 인증번호 전송 (개발 모드)');
    console.log('========================================');
    console.log(`원본 전화번호: ${phoneNumber}`);
    console.log(`저장된 전화번호: ${normalizedPhone}`);
    console.log(`인증번호: ${code}`);
    console.log(`만료 시간: ${expireTime} (5분 후)`);
    console.log('========================================\n');

    // 5분 후 자동 삭제
    setTimeout(() => {
      verificationCodes.delete(normalizedPhone);
      console.log(`[인증번호 만료] ${normalizedPhone}의 인증번호가 삭제되었습니다.`);
    }, 5 * 60 * 1000);

    return NextResponse.json({
      message: "인증번호가 전송되었습니다.",
      code,
    });
  } catch (error) {
    console.error("Send verification error:", error);
    return NextResponse.json(
      { error: "인증번호 전송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// verifyCode는 verification-store.ts에서 import하여 사용
