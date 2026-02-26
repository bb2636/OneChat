import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashSync } from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { username, phoneNumber, newPassword } = await request.json();

    if (!username || !phoneNumber || !newPassword) {
      return NextResponse.json(
        { error: "아이디, 전화번호, 새 비밀번호가 필요합니다." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "비밀번호를 8자 이상 입력해주세요." },
        { status: 400 }
      );
    }

    // 전화번호 정규화
    const normalizedPhone = phoneNumber.replace(/[^\d]/g, "");

    // 사용자 조회
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

    // 비밀번호 해싱
    let hashedPassword;
    try {
      hashedPassword = hashSync(newPassword, 10);
    } catch (hashError: any) {
      console.error("Password hashing error:", hashError);
      throw new Error(`비밀번호 해싱 실패: ${hashError?.message}`);
    }

    // 비밀번호 업데이트
    try {
      await sql`
        UPDATE users
        SET password = ${hashedPassword}, updated_at = ${new Date()}
        WHERE id = ${usersArray[0].id}
      `;
    } catch (dbError: any) {
      console.error("Database update error:", dbError);
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      message: "비밀번호가 재설정되었습니다.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      {
        error: "비밀번호 재설정 중 오류가 발생했습니다.",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
