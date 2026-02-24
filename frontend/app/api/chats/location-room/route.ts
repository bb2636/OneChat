import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const {
      creatorId,
      targetUserId,
      roomName,
      description,
      thumbnailUrl,
      memberLimit,
    } = (await request.json()) as {
      creatorId?: string;
      targetUserId?: string;
      roomName?: string;
      description?: string;
      thumbnailUrl?: string;
      memberLimit?: number;
    };

    if (!creatorId || !targetUserId) {
      return NextResponse.json({ error: "creatorId와 targetUserId가 필요합니다." }, { status: 400 });
    }
    if (creatorId === targetUserId) {
      return NextResponse.json({ error: "자기 자신과 채팅방을 만들 수 없습니다." }, { status: 400 });
    }

    const title = (roomName || "").trim();
    if (!title) {
      return NextResponse.json({ error: "채팅방 이름을 입력해주세요." }, { status: 400 });
    }
    if (title.length > 30) {
      return NextResponse.json({ error: "채팅방 이름은 30자 이하로 입력해주세요." }, { status: 400 });
    }

    const content = (description || "").trim();
    if (content.length > 300) {
      return NextResponse.json({ error: "채팅방 설명은 300자 이하로 입력해주세요." }, { status: 400 });
    }

    const limit = Math.max(2, Math.min(100, Number(memberLimit || 2)));

    const created = (await sql`
      INSERT INTO chats (
        id,
        workspace_id,
        user_id1,
        user_id2,
        title,
        pinned,
        chat_type,
        thumbnail_url,
        description,
        member_limit,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        NULL,
        ${creatorId},
        ${targetUserId},
        ${title},
        false,
        'location_room',
        ${thumbnailUrl?.trim() || null},
        ${content || null},
        ${limit},
        ${new Date()},
        ${new Date()}
      )
      RETURNING id, title, thumbnail_url, description, member_limit, chat_type, created_at, updated_at
    `) as unknown as Array<{
      id: string;
      title: string;
      thumbnail_url: string | null;
      description: string | null;
      member_limit: number;
      chat_type: string;
      created_at: string;
      updated_at: string;
    }>;

    const chat = created[0];

    await sql`
      INSERT INTO chat_members (chat_id, user_id, role)
      VALUES (${chat.id}, ${creatorId}, 'owner'), (${chat.id}, ${targetUserId}, 'member')
      ON CONFLICT (chat_id, user_id) DO NOTHING
    `;

    return NextResponse.json({ success: true, chat }, { status: 201 });
  } catch (error) {
    console.error("Failed to create location room:", error);
    return NextResponse.json({ error: "위치 기반 채팅방 생성에 실패했습니다." }, { status: 500 });
  }
}

