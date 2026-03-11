import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { sql } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId") || auth.userId;
    const isSelf = targetUserId === auth.userId;

    const rows = await sql`
      SELECT id, username, nickname, phone_number, avatar_url
      FROM users
      WHERE id = ${targetUserId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    const user = { ...rows[0] };
    if (!isSelf) {
      delete user.phone_number;
      delete user.username;
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to get profile:", error);
    return NextResponse.json({ error: "프로필 조회에 실패했습니다." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const userId = auth.userId;
    const { nickname, password, avatarUrl } = await request.json();

    const safeNickname = nickname?.trim() || null;
    const safePassword = password?.trim() || "";
    const hashedPassword = safePassword ? hashSync(safePassword, 10) : null;

    const updated = await sql`
      UPDATE users
      SET
        nickname = ${safeNickname},
        password = COALESCE(${hashedPassword}, password),
        avatar_url = ${avatarUrl || null},
        updated_at = ${new Date()}
      WHERE id = ${userId}
      RETURNING id, username, nickname, phone_number, avatar_url
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: "수정할 사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updated[0] });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "프로필 수정에 실패했습니다." }, { status: 500 });
  }
}
