import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// 임시: 실제로는 세션/쿠키에서 유저 정보를 가져와야 함
// 현재는 간단하게 구현
export async function GET() {
  try {
    // TODO: 실제 세션/쿠키에서 유저 ID 가져오기
    // 현재는 클라이언트에서 localStorage를 사용하도록 함
    
    return NextResponse.json(
      { error: "세션이 없습니다. 로그인이 필요합니다." },
      { status: 401 }
    );
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { error: "유저 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
