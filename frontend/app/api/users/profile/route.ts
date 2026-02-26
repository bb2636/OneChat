import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId가 필요합니다." }, { status: 400 });
    }

    const rows = (await sql`
      SELECT id, username, nickname, phone_number, avatar_url
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `) as unknown as Array<{
      id: string;
      username: string | null;
      nickname: string | null;
      phone_number: string | null;
      avatar_url: string | null;
    }>;

    if (rows.length === 0) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (error) {
    console.error("Failed to get profile:", error);
    return NextResponse.json({ error: "프로필 조회에 실패했습니다." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, nickname, password, avatarUrl } = (await request.json()) as {
      userId?: string;
      nickname?: string;
      password?: string;
      avatarUrl?: string | null;
    };

    if (!userId) {
      return NextResponse.json({ error: "userId가 필요합니다." }, { status: 400 });
    }

    const safeNickname = nickname?.trim() || null;
    const safePassword = password?.trim() || "";
    const hashedPassword = safePassword ? hashSync(safePassword, 10) : null;

    const updated = (await sql`
      UPDATE users
      SET
        nickname = ${safeNickname},
        password = COALESCE(${hashedPassword}, password),
        avatar_url = ${avatarUrl || null},
        updated_at = ${new Date()}
      WHERE id = ${userId}
      RETURNING id, username, nickname, phone_number, avatar_url
    `) as unknown as Array<{
      id: string;
      username: string | null;
      nickname: string | null;
      phone_number: string | null;
      avatar_url: string | null;
    }>;

    if (updated.length === 0) {
      return NextResponse.json({ error: "수정할 사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updated[0] });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "프로필 수정에 실패했습니다." }, { status: 500 });
  }
}

