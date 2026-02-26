// 인증번호 저장소 (공유 모듈)
// Next.js API 라우트 간 데이터 공유를 위한 모듈

export interface VerificationData {
  code: string;
  expiresAt: number;
}

// 인증번호 저장용 Map (메모리 기반, 실제 운영 시 Redis나 DB 사용 권장)
// Next.js dev 환경에서 라우트 모듈이 분리 로드되어도 같은 저장소를 보도록 globalThis를 사용한다.
const verificationStoreKey = "__onechat_verification_codes__";
const globalForVerification = globalThis as typeof globalThis & {
  [verificationStoreKey]?: Map<string, VerificationData>;
};

if (!globalForVerification[verificationStoreKey]) {
  globalForVerification[verificationStoreKey] = new Map<string, VerificationData>();
}

export const verificationCodes = globalForVerification[verificationStoreKey]!;

// 6자리 랜덤 인증번호 생성
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 인증번호 확인 함수
export function verifyCode(phoneNumber: string, code: string): boolean {
  const stored = verificationCodes.get(phoneNumber);
  if (!stored) {
    console.log(`[인증 실패] 저장된 인증번호 없음: ${phoneNumber}`);
    return false;
  }
  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(phoneNumber);
    console.log(`[인증 실패] 인증번호 만료: ${phoneNumber}`);
    return false;
  }
  const isValid = stored.code === code;
  console.log(`[인증 확인] 전화번호: ${phoneNumber}, 입력 코드: ${code}, 저장된 코드: ${stored.code}, 결과: ${isValid ? '성공' : '실패'}`);
  return isValid;
}
