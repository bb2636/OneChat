import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashSync } from "bcryptjs";
import { signToken, createTokenCookieHeader, verifyGoogleSignupToken, clearGoogleSignupCookieHeader } from "@/lib/auth";

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
      googleAuth,
    } = await request.json();

    const isGoogleUser = googleAuth === true;
    
    if (!isGoogleUser && (!username || !password)) {
      return NextResponse.json(
        { error: "아이디와 비밀번호가 필요합니다." },
        { status: 400 }
      );
    }

    let googleData: { providerId: string; email: string; name: string | null; avatarUrl: string | null } | null = null;

    if (isGoogleUser) {
      const verified = verifyGoogleSignupToken(request);
      if (!verified) {
        return NextResponse.json(
          { error: "구글 인증 정보가 유효하지 않거나 만료되었습니다. 다시 로그인해주세요." },
          { status: 401 }
        );
      }
      googleData = verified;
    }

    const userId = isGoogleUser ? googleData!.providerId : null;
    const email = isGoogleUser ? googleData!.email : null;
    const finalName = name || (isGoogleUser ? googleData!.name : null);
    const finalAvatarUrl = avatarUrl || (isGoogleUser ? googleData!.avatarUrl : null);

    if (isGoogleUser) {
      const existingNickname = await sql`
        SELECT id FROM users 
        WHERE nickname = ${nickname} AND id != ${userId}
        LIMIT 1
      `;
      if (existingNickname.length > 0) {
        return NextResponse.json(
          { error: "이미 사용 중인 닉네임입니다." },
          { status: 409 }
        );
      }
    } else {
      const existingUsers = await sql`
        SELECT id FROM users 
        WHERE username = ${username} OR nickname = ${nickname}
        LIMIT 1
      `;
      if (existingUsers.length > 0) {
        return NextResponse.json(
          { error: "이미 가입된 아이디 또는 닉네임입니다." },
          { status: 409 }
        );
      }
    }

    let hashedPassword: string | null = null;
    if (!isGoogleUser && password) {
      hashedPassword = hashSync(password, 10);
    }

    const now = new Date();
    let newUser: Array<{ id: string; username: string | null; nickname: string | null; name: string | null; avatar_url: string | null }>;
    
    try {
      if (isGoogleUser && userId) {
        const existingGoogleUser = await sql`
          SELECT id FROM users WHERE id = ${userId} LIMIT 1
        `;

        if (existingGoogleUser.length > 0) {
          newUser = await sql`
            UPDATE users
            SET 
              email = COALESCE(${email}, email),
              username = CASE WHEN username IS NULL OR username = '' THEN ${email || null} ELSE username END,
              nickname = ${nickname || null},
              name = ${finalName || null},
              avatar_url = ${finalAvatarUrl || null},
              phone_number = ${phoneNumber || null},
              phone_verified = ${phoneVerified || false},
              updated_at = ${now}
            WHERE id = ${userId}
            RETURNING id, username, nickname, name, avatar_url
          `;
        } else {
          newUser = await sql`
            INSERT INTO users (
              id, email, username, password, nickname, name,
              avatar_url, phone_number, phone_verified, created_at, updated_at
            )
            VALUES (
              ${userId}, ${email || null}, ${email || null}, ${null},
              ${nickname || null}, ${finalName || null}, ${finalAvatarUrl || null},
              ${phoneNumber || null}, ${phoneVerified || false}, ${now}, ${now}
            )
            RETURNING id, username, nickname, name, avatar_url
          `;
        }
      } else {
        newUser = await sql`
          INSERT INTO users (
            id, username, password, nickname, name,
            avatar_url, phone_number, phone_verified, created_at, updated_at
          )
          VALUES (
            gen_random_uuid(), ${username}, ${hashedPassword}, ${nickname || null},
            ${finalName || null}, ${finalAvatarUrl || null}, ${phoneNumber || null},
            ${phoneVerified || false}, ${now}, ${now}
          )
          RETURNING id, username, nickname, name, avatar_url
        `;
      }
    } catch (dbError: unknown) {
      console.error("Database insert error:", dbError);
      const msg = dbError instanceof Error ? dbError.message : String(dbError);
      const code = (dbError as { code?: string }).code;
      if (msg.includes("unique") || code === "23505") {
        return NextResponse.json(
          { error: "이미 가입된 정보가 있습니다." },
          { status: 409 }
        );
      }
      throw dbError;
    }

    if (newUser.length === 0) {
      return NextResponse.json(
        { error: "사용자 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    const token = signToken({ userId: newUser[0].id, role: "user" });

    const response = NextResponse.json(
      {
        user: {
          id: newUser[0].id,
          username: newUser[0].username,
          nickname: newUser[0].nickname,
          name: newUser[0].name,
          avatar_url: newUser[0].avatar_url,
        },
      },
      { status: 201 }
    );

    response.headers.append("Set-Cookie", createTokenCookieHeader(token));
    if (isGoogleUser) {
      response.headers.append("Set-Cookie", clearGoogleSignupCookieHeader());
    }
    return response;
  } catch (error: unknown) {
    console.error("Signup complete error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: string }).code;

    if (msg.includes("unique") || code === "23505") {
      return NextResponse.json(
        { error: "이미 가입된 정보가 있습니다." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
