import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashSync } from "bcryptjs";

export async function POST(request: Request) {
  try {
    const {
      username,
      password,
      nickname,
      name,
      avatarUrl,
      phoneNumber,
      phoneVerified,
      agreedTermIds,
    } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호가 필요합니다." },
        { status: 400 }
      );
    }

    // 최종 아이디 및 닉네임 중복 확인
    let existingUsers: Array<{ id: string }> | unknown;
    try {
      existingUsers = await sql`
        SELECT id FROM users 
        WHERE username = ${username} OR nickname = ${nickname}
        LIMIT 1
      `;
    } catch (dbError: any) {
      console.error("Database query error:", dbError);
      if (dbError?.message?.includes("does not exist") || dbError?.message?.includes("relation")) {
        existingUsers = [];
      } else {
        throw dbError;
      }
    }

    const usersArray = Array.isArray(existingUsers) ? existingUsers : [];
    if (usersArray.length > 0) {
      return NextResponse.json(
        { error: "이미 가입된 아이디 또는 닉네임입니다." },
        { status: 409 }
      );
    }

    // 비밀번호 해싱
    let hashedPassword;
    try {
      hashedPassword = hashSync(password, 10);
    } catch (hashError: any) {
      console.error("Password hashing error:", hashError);
      throw new Error(`비밀번호 해싱 실패: ${hashError?.message}`);
    }

    // 최종 사용자 생성 (모든 단계 완료 후)
    const now = new Date();
    let newUser: Array<{ id: string; username: string; nickname: string | null; name: string | null; avatar_url: string | null }> | unknown;
    try {
      newUser = await sql`
        INSERT INTO users (
          id,
          username,
          password,
          nickname,
          name,
          avatar_url,
          phone_number,
          phone_verified,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          ${username},
          ${hashedPassword},
          ${nickname || null},
          ${name || null},
          ${avatarUrl || null},
          ${phoneNumber || null},
          ${phoneVerified || false},
          ${now},
          ${now}
        )
        RETURNING id, username, nickname, name, avatar_url
      `;
    } catch (dbError: any) {
      console.error("Database insert error:", dbError);
      // 중복 에러 처리
      if (dbError?.message?.includes("unique") || dbError?.code === "23505") {
        return NextResponse.json(
          { error: "이미 가입된 정보가 있습니다." },
          { status: 409 }
        );
      }
      throw dbError;
    }

    // 결과가 배열인지 확인
    const newUserArray = Array.isArray(newUser) ? newUser : [];
    
    if (newUserArray.length === 0) {
      throw new Error("사용자 생성에 실패했습니다.");
    }

    // 약관 동의 기록 (약관 동의 테이블이 있다면 추가)
    // 여기서는 간단하게 처리

    return NextResponse.json(
      {
        user: {
          id: newUserArray[0].id,
          username: newUserArray[0].username,
          nickname: newUserArray[0].nickname,
          name: newUserArray[0].name,
          avatar_url: newUserArray[0].avatar_url,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Signup complete error:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
    });
    
    // 중복 에러 처리
    if (error.message?.includes("unique") || error.code === "23505") {
      return NextResponse.json(
        { error: "이미 가입된 정보가 있습니다." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        error: "회원가입 중 오류가 발생했습니다.",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
